import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Zillow address-page URL pattern (resolves by address)
const zillow = (addr) =>
  "https://www.zillow.com/homes/" +
  addr.replace(/\s+/g, "-").replace(/,/g, "") +
  "-Philadelphia-PA-19125_rb/";
// Fallback link for LoopNet listings (Google finds the exact page)
const google = (addr) =>
  "https://www.google.com/search?q=" +
  encodeURIComponent(addr + " Philadelphia loopnet");

const PROPERTIES = [
  // --- Land / lots (Zillow, 19125) ---
  {
    address: "2645 Kensington Ave, Philadelphia, PA 19125",
    neighborhood: "Kensington",
    propertyType: "Land",
    price: 89900,
    mls: "PAPH2597028",
    brokerName: "Keller Williams Main Line",
    listingUrl: zillow("2645 Kensington Ave"),
    lat: 39.9905, lng: -75.1225,
  },
  {
    address: "2501 Potter St, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Land",
    price: 29900,
    mls: "PAPH2024636",
    brokerName: "Urban Realty Corporation",
    listingUrl: zillow("2501 Potter St"),
    lat: 39.9862, lng: -75.1198,
  },
  {
    address: "2647 Emerald St, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Land",
    price: 74900,
    mls: "PAPH2155146",
    brokerName: "Urban Realty Corporation",
    listingUrl: zillow("2647 Emerald St"),
    lat: 39.9909, lng: -75.1255,
  },
  {
    address: "1937 E Harold St, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Land",
    price: 55000,
    mls: "PAPH2607716",
    brokerName: "Tesla Realty Group, LLC",
    listingUrl: zillow("1937 E Harold St"),
    lat: 39.9836, lng: -75.1268,
  },
  {
    address: "1845 E Albert St, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Land",
    price: 65000,
    mls: "PAPH2612506",
    brokerName: "Opus Elite Real Estate",
    listingUrl: zillow("1845 E Albert St"),
    lat: 39.9828, lng: -75.1283,
  },
  {
    address: "2657 Mercer St, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Land",
    price: 190000,
    mls: "PAPH2572382",
    brokerName: "Realty Mark Cityscape",
    listingUrl: zillow("2657 Mercer St"),
    lat: 39.9884, lng: -75.1236,
  },
  // --- Commercial / industrial / mixed (LoopNet, 19125) ---
  {
    address: "2409-2417 Cedar St, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Industrial",
    price: 1500000,
    sizeText: "6,753 SF",
    brokerName: "Frank Cullen",
    listingUrl: google("2409-2417 Cedar St"),
    notes:
      "6,753 SF building on ~3,906 SF site. New Ruberoid roof over 85% (2 yrs old). 16-18' clear ceilings, 240V/800A electric, 12'x14' drive-in door, one 16-ton overhead crane + three jib cranes w/ 1-ton hoist, natural gas.",
    lat: 39.9856, lng: -75.1245,
  },
  {
    address: "1140 Frankford Ave, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Commercial",
    price: 1189000,
    sizeText: "2,470 SF",
    zoning: "CMX-2.5",
    brokerName: "Jared Gruber",
    listingUrl: google("1140 Frankford Ave"),
    notes:
      "Retail building in the heart of Fishtown on the Frankford Ave corridor. 95 Walk Score, heavy foot traffic. Modern build-out, polished concrete, private fiberglass roofdeck. Currently ideal for professional office / retail.",
    lat: 39.9718, lng: -75.1338,
  },
  {
    address: "250 E Girard Ave, Philadelphia, PA 19125",
    neighborhood: "Fishtown",
    propertyType: "Mixed-use",
    price: 1399000,
    sizeText: "4 units",
    brokerName: "Adam Aronstein",
    listingUrl: google("250 E Girard Ave"),
    notes:
      "4-unit apartment building with established Thai restaurant on the ground-floor retail (long-term lease). Three newly renovated apartments. High-traffic Girard Ave corridor, strong transit. Approved city air rights for vertical expansion.",
    lat: 39.9683, lng: -75.1361,
  },
];

async function geocode(address) {
  let q = address.trim();
  if (!/philadelphia/i.test(q)) q += ", Philadelphia, PA";
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PhillyDealTracker/1.0 (seed)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const count = await prisma.property.count();
  if (count > 0) {
    console.log(`DB already has ${count} properties — skipping seed.`);
    return;
  }
  for (const p of PROPERTIES) {
    const geo = await geocode(p.address); // accurate coords when available
    await prisma.property.create({
      data: {
        ...p,
        status: "Watching",
        addedBy: "Leon",
        lat: geo?.lat ?? p.lat,
        lng: geo?.lng ?? p.lng,
      },
    });
    console.log(
      `+ ${p.address}  ${geo ? "(geocoded)" : "(fallback coords)"}`
    );
    await sleep(1100); // respect Nominatim ~1 req/sec
  }
  console.log(`Seeded ${PROPERTIES.length} properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
