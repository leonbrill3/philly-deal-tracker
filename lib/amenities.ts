// "Key Locations" layers shown as reference overlays on the map.
// A category resolves via one of:
//   - curated list        (landmarks)
//   - placeType           Places searchNearby, single includedType
//   - includedTypes[]     Places searchNearby, multiple types (+ optional review sort)
//   - textQuery           Places searchText (brand/keyword)

export type AmenityCategory = {
  key: string;
  label: string;
  emoji: string;
  color: string;
  placeType?: string;
  includedTypes?: string[];
  rankByReviews?: boolean; // sort results by Google review count desc
  textQuery?: string;
  brands?: string[]; // fan out one text search per brand, merge + dedupe
};

// Biggest national QSR / hospitality brands (one merged "Major chains" layer).
export const MAJOR_CHAINS = [
  "McDonald's",
  "Starbucks",
  "Chick-fil-A",
  "Taco Bell",
  "Wendy's",
  "Burger King",
  "Dunkin'",
  "Subway",
  "Chipotle Mexican Grill",
  "Domino's Pizza",
  "Popeyes Louisiana Kitchen",
  "KFC",
  "Panera Bread",
  "Raising Cane's",
  "Panda Express",
  "Sonic Drive-In",
  "Pizza Hut",
  "Dairy Queen",
  "Jack in the Box",
  "Five Guys",
];

// Biggest national retail brands (one merged "Major retail" layer).
// Amazon's physical footprint = Whole Foods + Amazon Fresh.
export const MAJOR_RETAIL = [
  "Walmart",
  "Amazon Fresh",
  "Whole Foods Market",
  "Costco Wholesale",
  "Target",
  "The Home Depot",
  "Lowe's Home Improvement",
  "Kroger",
  "CVS",
  "Walgreens",
  "Best Buy",
  "TJ Maxx",
  "Aldi",
  "Dollar General",
  "Dollar Tree",
  "Publix",
  "Macy's",
  "Kohl's",
  "Nordstrom",
  "Ross Dress for Less",
  "IKEA",
  "Zara",
  "H&M",
];

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  { key: "landmarks", label: "Landmarks & stadiums", emoji: "🏟️", color: "#b91c1c" },
  {
    key: "topRated",
    label: "Most-reviewed",
    emoji: "🔥",
    color: "#db2777",
    includedTypes: [
      "restaurant",
      "bar",
      "cafe",
      "tourist_attraction",
      "shopping_mall",
      "night_club",
      "art_gallery",
      "museum",
    ],
    rankByReviews: true,
  },
  { key: "chains", label: "Major chains", emoji: "🍟", color: "#ca8a04", brands: MAJOR_CHAINS },
  { key: "retail", label: "Major retail", emoji: "🛍️", color: "#0369a1", brands: MAJOR_RETAIL },
  { key: "hospitals", label: "Hospitals", emoji: "🏥", color: "#dc2626", placeType: "hospital" },
  { key: "hotels", label: "Hotels", emoji: "🏨", color: "#7c3aed", placeType: "hotel" },
  { key: "wholeFoods", label: "Whole Foods", emoji: "🥬", color: "#0a7d33", textQuery: "Whole Foods Market" },
  { key: "wonder", label: "Wonder", emoji: "🍔", color: "#111827", textQuery: "Wonder" },
  { key: "starbucks", label: "Starbucks", emoji: "⭐", color: "#00704a", textQuery: "Starbucks" },
  { key: "chipotle", label: "Chipotle", emoji: "🌯", color: "#a81612", textQuery: "Chipotle Mexican Grill" },
  { key: "coffee", label: "Coffee", emoji: "☕", color: "#6f4e37", placeType: "coffee_shop" },
  { key: "grocery", label: "Grocery", emoji: "🛒", color: "#047857", placeType: "supermarket" },
  { key: "restaurants", label: "Restaurants", emoji: "🍽️", color: "#ea580c", placeType: "restaurant" },
  { key: "bars", label: "Bars", emoji: "🍺", color: "#b45309", placeType: "bar" },
  { key: "gyms", label: "Gyms", emoji: "🏋️", color: "#4338ca", placeType: "gym" },
];

export function categoryByKey(key: string): AmenityCategory | undefined {
  return AMENITY_CATEGORIES.find((c) => c.key === key);
}

// Curated Philadelphia staple landmarks. Resolved to accurate coordinates via
// Places Text Search on the server (and cached), so we never hardcode coords.
export const CURATED_LANDMARKS: { name: string; query: string }[] = [
  { name: "La Colombe Coffee (Fishtown flagship)", query: "La Colombe Coffee 1335 Frankford Ave Philadelphia" },
  { name: "Citizens Bank Park (Phillies)", query: "Citizens Bank Park Philadelphia" },
  { name: "Lincoln Financial Field (Eagles)", query: "Lincoln Financial Field Philadelphia" },
  { name: "Wells Fargo Center (Sixers / Flyers)", query: "Wells Fargo Center Philadelphia" },
  { name: "Rivers Casino Philadelphia", query: "Rivers Casino Philadelphia" },
  { name: "Penn Treaty Park", query: "Penn Treaty Park Philadelphia" },
  { name: "The Fillmore Philadelphia", query: "The Fillmore Philadelphia" },
  { name: "Reading Terminal Market", query: "Reading Terminal Market Philadelphia" },
  { name: "Independence Hall", query: "Independence Hall Philadelphia" },
  { name: "Comcast Center", query: "Comcast Technology Center Philadelphia" },
];

export type AmenityPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  reviews?: number;
  mapsUri?: string;
};
