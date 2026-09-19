// One-off importer: POST listings through the app's /api/properties route so
// each is geocoded the same way the Add form does. Skips addresses already present.
const BASE = process.env.BASE || "http://localhost:3000";

const zillow = (addr) =>
  "https://www.zillow.com/homes/" +
  addr.replace(/#\S+/, "").trim().replace(/\s+/g, "-").replace(/,/g, "") +
  "-Philadelphia-PA-19125_rb/";

const res = (bd, ba, sf) => `${bd} bd · ${ba} ba · ${sf.toLocaleString()} SF`;

const LISTINGS = [
  { address: "2658 Janney St, Philadelphia, PA 19125", propertyType: "Land", neighborhood: "Fishtown", price: 77500, mls: "PAPH2598992", brokerName: "Compass RE" },
  { address: "2002 Trenton Ave, Philadelphia, PA 19125", propertyType: "Land", neighborhood: "Fishtown", price: 100000, mls: "PAPH2428036", brokerName: "MaxPort Realty Solutions Inc" },
  { address: "145 E Lehigh Ave, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Kensington", price: 229000, sizeText: res(5, 2, 1440), mls: "PAPH2546886", brokerName: "Keller Williams Real Estate-Blue Bell", notes: "Townhouse. 5 bd / 2 ba / 1,440 sqft." },
  { address: "1905 E Harold St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 415000, sizeText: res(3, 3, 1605), mls: "PAPH2631628", brokerName: "TCS Management, LLC", notes: "Townhouse. 3 bd / 3 ba / 1,605 sqft." },
  { address: "2207 E Oakdale St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 439900, sizeText: res(3, 3, 2035), mls: "PAPH2617170", brokerName: "BHHS Fox & Roach-Medford", notes: "Townhouse. 3 bd / 3 ba / 2,035 sqft." },
  { address: "2231 Ritter St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 600000, sizeText: res(3, 1, 2045), mls: "PAPH2642352", brokerName: "Elfant Wissahickon Realtors", notes: "Townhouse. 3 bd / 1 ba / 2,045 sqft." },
  { address: "1927 E Letterly St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 445000, sizeText: res(3, 3, 1685), mls: "PAPH2667892", brokerName: "Elfant Wissahickon-Rittenhouse Square", notes: "Townhouse. 3 bd / 3 ba / 1,685 sqft." },
  { address: "2310 E Cabot St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 360000, sizeText: res(3, 3, 1458), mls: "PAPH2665646", brokerName: "Space & Company", notes: "Townhouse. 3 bd / 3 ba / 1,458 sqft." },
  { address: "1928 E Lehigh Ave, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Kensington", price: 249000, sizeText: res(3, 2, 1210), mls: "PAPH2667068", brokerName: "HomeSmart Realty Advisors", notes: "Townhouse. 3 bd / 2 ba / 1,210 sqft." },
  { address: "102 E Huntingdon St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Kensington", price: 250000, sizeText: res(4, 2, 1488), mls: "PAPH2635010", brokerName: "JG Real Estate LLC", notes: "Townhouse. 4 bd / 2 ba / 1,488 sqft." },
  { address: "2603 E Hagert St #0, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 400000, sizeText: res(3, 3, 1609), mls: "PAPH2648616", brokerName: "KW Empower", notes: "Apartment/condo. 3 bd / 3 ba / 1,609 sqft." },
  { address: "2655 Cedar St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 255000, sizeText: res(3, 2, 1086), mls: "PAPH2668300", brokerName: "KW Empower", notes: "Townhouse. 3 bd / 2 ba / 1,086 sqft." },
  { address: "2015 Martha St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 474500, sizeText: res(3, 2, 1650), mls: "PAPH2667078", brokerName: "Compass RE", notes: "Townhouse. 3 bd / 2 ba / 1,650 sqft." },
  { address: "1230 E Fletcher St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 355000, sizeText: res(4, 3, 2240), mls: "PAPH2619654", brokerName: "Keller Williams Real Estate -Exton", notes: "Townhouse. 4 bd / 3 ba / 2,240 sqft." },
  { address: "2144 E Tucker St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 349999, sizeText: res(3, 3, 1623), mls: "PAPH2643396", brokerName: "EveryHome Realtors", notes: "House. 3 bd / 3 ba / 1,623 sqft." },
  { address: "2342 E Huntingdon St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Kensington", price: 319000, sizeText: res(3, 2, 1236), mls: "PAPH2650234", brokerName: "KW Empower", notes: "Townhouse. 3 bd / 2 ba / 1,236 sqft." },
  { address: "2535 Tilton St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 299999, sizeText: res(3, 1, 1778), mls: "PAPH2618046", brokerName: "Keller Williams Real Estate-Horsham", notes: "Townhouse. 3 bd / 1 ba / 1,778 sqft." },
  { address: "2324 Sepviva St, Philadelphia, PA 19125", propertyType: "Residential", neighborhood: "Fishtown", price: 425000, sizeText: res(3, 2, 1548), mls: "", brokerName: "", notes: "Townhouse. 3 bd / 2 ba / 1,548 sqft. (MLS/broker not captured — paste was cut off.)" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const existing = await (await fetch(`${BASE}/api/properties`)).json();
  const seen = new Set(existing.map((p) => p.address));
  let added = 0;
  for (const l of LISTINGS) {
    if (seen.has(l.address)) {
      console.log(`= skip (already present): ${l.address}`);
      continue;
    }
    const body = { ...l, addedBy: "Leon", listingUrl: zillow(l.address), status: "Watching" };
    const r = await fetch(`${BASE}/api/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    console.log(`+ ${l.propertyType.padEnd(11)} ${l.address}  ${j.lat ? "(pinned)" : "(no coords)"}`);
    added++;
    await sleep(1200); // respect Nominatim ~1 req/sec
  }
  console.log(`\nAdded ${added} listings.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
