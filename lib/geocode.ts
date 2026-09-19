// Free geocoding via OpenStreetMap Nominatim (no API key required).
// Nominatim policy requires a valid User-Agent / Referer.
async function nominatim(
  q: string
): Promise<{ lat: number; lng: number } | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PhillyDealTracker/1.0 (internal property tracker)",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  let q = address.trim();
  if (!/philadelphia/i.test(q)) q += ", Philadelphia, PA";

  const first = await nominatim(q);
  if (first) return first;

  // Fallback: collapse an address range ("2409-2417 Cedar St" or
  // "2409 2417 Cedar St") to its first number, which geocoders handle.
  const collapsed = q.replace(/^(\d+)[\s-]+\d+\s+/, "$1 ");
  if (collapsed !== q) return nominatim(collapsed);
  return null;
}
