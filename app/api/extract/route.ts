import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseListingUrl } from "@/lib/parseListingUrl";
import { geocodeAddress } from "@/lib/geocode";
import { PROPERTY_TYPES } from "@/lib/constants";

// 19125-area zips → our neighborhood buckets (best-effort default)
const ZIP_NEIGHBORHOOD: Record<string, string> = {
  "19125": "Fishtown",
  "19122": "Northern Liberties",
  "19123": "Northern Liberties",
  "19134": "Kensington",
  "19133": "Kensington",
  "19146": "Graduate Hospital",
  "19147": "Washington Square",
  "19107": "Washington Square",
};

type Enriched = {
  price: number | null;
  propertyType: string | null;
  sizeText: string | null;
  zoning: string | null;
  mls: string | null;
  brokerName: string | null;
  notes: string | null;
};

// Use Claude + server-side web search to pull full listing details for an
// address. Works "from anywhere" — Zillow/LoopNet/Crexi/Redfin all block direct
// fetch, but aggregator sites (Compass, Coldwell, Realtor…) are searchable.
async function enrichWithClaude(
  address: string,
  url: string,
  source: string | null
): Promise<Enriched | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  // Cap the request so a slow/hung web search can never leave the form stuck —
  // on timeout we fall back to the address + pin the URL already gave us.
  const client = new Anthropic({ timeout: 60000, maxRetries: 1 });

  const prompt = `You are extracting real-estate listing data. Find the CURRENT for-sale listing for this property and return its details.

Address: ${address}
${source ? `Listing source: ${source}` : ""}
Listing URL: ${url}

Search the web (the original page may block scrapers, so also check aggregators like Compass, Coldwell Banker, Realtor.com, Redfin, Crexi, LoopNet). Cross-check at least two sources and make sure every field is for THIS EXACT address — never use a figure from a neighboring address, a comp, a sold record, or a Zestimate/estimate. Then respond with ONLY a JSON object (no prose, no code fences) with these fields:
{
  "price": number | null,            // the CURRENT for-sale LIST price for this exact address/MLS, digits only (e.g. 419000). Not a Zestimate, not a sold price, not a comp.
  "propertyType": "Land" | "Residential" | "Commercial" | "Industrial" | "Mixed-use" | null,
  "sizeText": string | null,          // homes: "3 bd · 2 ba · 1,680 SF"; commercial: "5,900 SF" or "7 units · 5,900 SF"
  "zoning": string | null,            // e.g. "CMX-2.5", "RSA5"
  "mls": string | null,               // MLS number
  "brokerName": string | null,        // listing brokerage / agent
  "notes": string | null              // 1-2 sentence summary of the property
}
Use null for anything you cannot verify. A multifamily building with ground-floor commercial is "Mixed-use". A pure apartment building is "Residential". Vacant land is "Land". Output ONLY the JSON.`;

  try {
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];
    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      thinking: { type: "disabled" },
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    });

    // Server-side web search may hit its iteration cap → pause_turn; resume.
    let guard = 0;
    while (response.stop_reason === "pause_turn" && guard++ < 2) {
      messages = [
        { role: "user", content: prompt },
        { role: "assistant", content: response.content },
      ];
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        thinking: { type: "disabled" },
        tools: [{ type: "web_search_20260209", name: "web_search" }],
        messages,
      });
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const raw = JSON.parse(match[0]) as Partial<Enriched>;

    const propertyType =
      raw.propertyType &&
      (PROPERTY_TYPES as readonly string[]).includes(raw.propertyType)
        ? raw.propertyType
        : null;

    return {
      price: typeof raw.price === "number" ? raw.price : null,
      propertyType,
      sizeText: raw.sizeText || null,
      zoning: raw.zoning || null,
      mls: raw.mls || null,
      brokerName: raw.brokerName || null,
      notes: raw.notes || null,
    };
  } catch (e) {
    console.error("enrichWithClaude failed:", e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const parsed = parseListingUrl(url);
  if (!parsed.address)
    return NextResponse.json(
      {
        error:
          "Couldn't read an address from that link — paste the full listing URL, or enter the address manually.",
        source: parsed.source,
      },
      { status: 422 }
    );

  // Run geocoding and Claude enrichment in parallel
  const [geo, enriched] = await Promise.all([
    geocodeAddress(parsed.address),
    enrichWithClaude(parsed.address, url, parsed.source),
  ]);

  return NextResponse.json({
    address: parsed.address,
    listingUrl: url,
    source: parsed.source,
    // Prefer verified details from Claude; fall back to URL-based guesses
    propertyType: enriched?.propertyType ?? parsed.propertyTypeGuess,
    neighborhood: parsed.zip ? ZIP_NEIGHBORHOOD[parsed.zip] ?? null : null,
    price: enriched?.price ?? null,
    sizeText: enriched?.sizeText ?? null,
    zoning: enriched?.zoning ?? null,
    mls: enriched?.mls ?? null,
    brokerName: enriched?.brokerName ?? null,
    notes: enriched?.notes ?? null,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    geocoded: !!geo,
    enriched: !!enriched,
  });
}
