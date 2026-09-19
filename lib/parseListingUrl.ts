// Extract what we can from a Zillow / LoopNet / Redfin / Compass / Realtor
// listing URL. These sites block bots (403), so we can't fetch the page — but
// the address lives in the URL slug, which is enough to geocode + drop a pin.

export type ParsedListing = {
  address: string | null;
  zip: string | null;
  source: string | null; // "Zillow" | "LoopNet" | "Redfin" | ...
  propertyTypeGuess: string | null;
};

const STREET_RE =
  /\b(st|street|ave|avenue|rd|road|blvd|dr|drive|ln|lane|ct|court|pl|place|ter|terrace|way|pike|hwy|highway|sq|square)\b/i;

function sourceOf(host: string): string | null {
  if (host.includes("zillow")) return "Zillow";
  if (host.includes("loopnet")) return "LoopNet";
  if (host.includes("redfin")) return "Redfin";
  if (host.includes("compass")) return "Compass";
  if (host.includes("realtor")) return "Realtor.com";
  if (host.includes("crexi")) return "Crexi";
  if (host.includes("homes.com")) return "Homes.com";
  return null;
}

function cleanSlug(seg: string): string {
  return seg
    .replace(/_(rb|zpid)\b.*$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseListingUrl(raw: string): ParsedListing {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { address: null, zip: null, source: null, propertyTypeGuess: null };
  }

  const host = url.hostname.toLowerCase();
  const source = sourceOf(host);
  const segments = decodeURIComponent(url.pathname)
    .split("/")
    .filter(Boolean);

  // Find the segment that looks like a street address (has a number + street word)
  let addrSeg =
    segments.find((s) => /\d/.test(s) && STREET_RE.test(s.replace(/[-_]/g, " "))) ??
    null;

  // Redfin slugs omit city/state (they're separate path parts) e.g.
  // /PA/Philadelphia/1443-E-Oxford-St-19125/home/38461278
  let city = "";
  let state = "";
  if (host.includes("redfin") && segments.length >= 3) {
    state = segments[0];
    city = segments[1];
  }

  let address: string | null = null;
  let zip: string | null = null;

  if (addrSeg) {
    let s = cleanSlug(addrSeg);
    const zipMatch = s.match(/\b(\d{5})\b/);
    zip = zipMatch ? zipMatch[1] : null;

    // Redfin: append the city/state from the path
    if (host.includes("redfin") && city) {
      s = `${s.replace(/\b\d{5}\b/, "").trim()}, ${decodeURIComponent(
        city
      ).replace(/-/g, " ")}, ${state}${zip ? " " + zip : ""}`;
    } else if (!/philadelphia/i.test(s)) {
      // Default market
      s = `${s}, Philadelphia, PA`;
    } else {
      // Insert commas around city/state for readability
      s = s.replace(/\s+Philadelphia\s+PA/i, ", Philadelphia, PA");
    }
    address = s
      .replace(/^(\d+)\s+(\d+)\s+/, "$1-$2 ") // leading "2409 2417" → "2409-2417"
      .replace(/\s+,/g, ",")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Type guess from source + slug hints
  const lowerPath = url.pathname.toLowerCase();
  let propertyTypeGuess: string | null = null;
  if (/\blot\b|\bland\b/.test(lowerPath)) propertyTypeGuess = "Land";
  else if (host.includes("loopnet") || /\bcommercial\b/.test(lowerPath))
    propertyTypeGuess = "Commercial";
  else if (source) propertyTypeGuess = "Residential";

  return { address, zip, source, propertyTypeGuess };
}
