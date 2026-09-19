import { NextRequest, NextResponse } from "next/server";
import {
  categoryByKey,
  CURATED_LANDMARKS,
  AmenityPlace,
} from "@/lib/amenities";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const FIELD_MASK =
  "places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri";

// Simple in-memory cache (survives across requests in a warm server).
const cache = new Map<string, { at: number; data: AmenityPlace[] }>();
const TTL = 1000 * 60 * 60 * 6; // 6h

type PlacesResult = {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    location?: { latitude: number; longitude: number };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
  }>;
};

function normalize(r: PlacesResult): AmenityPlace[] {
  return (r.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? "Place",
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      address: p.formattedAddress,
      rating: p.rating,
      reviews: p.userRatingCount,
      mapsUri: p.googleMapsUri,
    }));
}

async function searchNearby(
  includedTypes: string[],
  lat: number,
  lng: number,
  radius: number,
  rankByReviews = false
): Promise<AmenityPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      rankPreference: rankByReviews ? "POPULARITY" : "DISTANCE",
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
    }),
  });
  if (!res.ok) return [];
  let out = normalize(await res.json());
  if (rankByReviews) {
    out = out
      .filter((p) => (p.reviews ?? 0) > 0)
      .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
  }
  return out;
}

async function searchText(
  textQuery: string,
  lat: number,
  lng: number,
  radius: number,
  maxResultCount = 20
): Promise<AmenityPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
    }),
  });
  if (!res.ok) return [];
  return normalize(await res.json());
}

// Fan out one text search per brand, then merge + dedupe by place id.
async function searchBrands(
  brands: string[],
  lat: number,
  lng: number,
  radius: number
): Promise<AmenityPlace[]> {
  const perBrand = await Promise.all(
    brands.map((b) => searchText(b, lat, lng, radius, 6))
  );
  const seen = new Map<string, AmenityPlace>();
  for (const list of perBrand)
    for (const p of list) if (!seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

async function resolveLandmarks(): Promise<AmenityPlace[]> {
  const cacheKey = "landmarks";
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const results = await Promise.all(
    CURATED_LANDMARKS.map(async (lm) => {
      const found = await searchText(lm.query, 39.9526, -75.1652, 20000);
      const p = found[0];
      if (!p) return null;
      return { ...p, name: lm.name } as AmenityPlace;
    })
  );
  const data = results.filter(Boolean) as AmenityPlace[];
  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function GET(req: NextRequest) {
  if (!KEY)
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY not configured" },
      { status: 500 }
    );

  const sp = req.nextUrl.searchParams;
  const catKey = sp.get("cat") ?? "";
  const cat = categoryByKey(catKey);
  if (!cat)
    return NextResponse.json({ error: "unknown category" }, { status: 400 });

  if (cat.key === "landmarks") {
    return NextResponse.json({ places: await resolveLandmarks() });
  }

  const lat = parseFloat(sp.get("lat") ?? "39.969");
  const lng = parseFloat(sp.get("lng") ?? "-75.134");
  const radius = Math.min(
    Math.max(parseFloat(sp.get("radius") ?? "3000"), 500),
    50000
  );

  // Cache by category + rounded location + rounded radius
  const cacheKey = `${cat.key}:${lat.toFixed(2)}:${lng.toFixed(2)}:${Math.round(
    radius / 500
  )}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL)
    return NextResponse.json({ places: hit.data });

  let data: AmenityPlace[] = [];
  if (cat.brands) data = await searchBrands(cat.brands, lat, lng, radius);
  else if (cat.includedTypes)
    data = await searchNearby(
      cat.includedTypes,
      lat,
      lng,
      radius,
      cat.rankByReviews
    );
  else if (cat.placeType)
    data = await searchNearby([cat.placeType], lat, lng, radius);
  else if (cat.textQuery)
    data = await searchText(cat.textQuery, lat, lng, radius);

  cache.set(cacheKey, { at: Date.now(), data });
  return NextResponse.json({ places: data });
}
