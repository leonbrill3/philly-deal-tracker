export const NEIGHBORHOODS = [
  "Fishtown",
  "Northern Liberties",
  "Washington Square",
  "Graduate Hospital",
  "Kensington",
  "Other",
] as const;

// Short investment thesis per target neighborhood
export const NEIGHBORHOOD_THESIS: Record<string, string> = {
  Fishtown:
    "Explosive growth over the last few years — Frankford Ave corridor is a walkable dining/retail hotspot pulling in young buyers and businesses.",
  "Northern Liberties":
    "Adjacent to Fishtown and riding the same wave — dense infill, new construction, and strong rents.",
  "Washington Square":
    "Well-established, blue-chip Center City area. A consistent hotspot with durable demand and premium pricing.",
  "Graduate Hospital":
    "More residential but growing fast — steady appreciation and strong owner-occupant demand just south of Center City.",
  Kensington: "Rapidly changing area bordering Fishtown with value plays and land.",
  Other: "",
};

export const PROPERTY_TYPES = [
  "Land",
  "Residential",
  "Commercial",
  "Industrial",
  "Mixed-use",
] as const;

// Marker / badge color per property type
export const TYPE_COLORS: Record<string, string> = {
  Land: "#16a34a", // green
  Residential: "#2563eb", // blue
  Commercial: "#dc2626", // red
  Industrial: "#4b5563", // gray
  "Mixed-use": "#9333ea", // purple
};

export const STATUSES = [
  "Watching",
  "Contacted",
  "Under Contract",
  "Passed",
  "Closed",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  Watching: "#0891b2",
  Contacted: "#ca8a04",
  "Under Contract": "#7c3aed",
  Passed: "#6b7280",
  Closed: "#16a34a",
};

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type Neighborhood = (typeof NEIGHBORHOODS)[number];
export type Status = (typeof STATUSES)[number];

export function formatPrice(price?: number | null): string {
  if (price == null) return "—";
  return "$" + price.toLocaleString("en-US");
}
