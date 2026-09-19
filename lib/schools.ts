import { getRating, gsSearchUrl } from "./schoolRatings";

const ARCGIS =
  "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services";
const LAYER: Record<Level, string> = {
  es: "SchoolDist_Catchments_ES",
  ms: "SchoolDist_Catchments_MS",
  hs: "SchoolDist_Catchments_HS",
};

export type Level = "es" | "ms" | "hs";

export type AssignedSchool = {
  level: Level;
  levelLabel: string;
  name: string;
  grade: string | null;
  rating: number | null;
  gsUrl: string;
};

const nameField: Record<Level, string> = {
  es: "es_name",
  ms: "ms_name",
  hs: "hs_name",
};
const gradeField: Record<Level, string> = {
  es: "es_grade",
  ms: "ms_grade",
  hs: "hs_grade",
};

async function queryPoint(
  level: Level,
  lat: number,
  lng: number
): Promise<AssignedSchool | null> {
  const url =
    `${ARCGIS}/${LAYER[level]}/FeatureServer/0/query?` +
    `geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects&outFields=*&f=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const j = await res.json();
    const a = j.features?.[0]?.attributes;
    if (!a) return null;
    const name = a[nameField[level]] as string;
    if (!name) return null;
    const r = getRating(name);
    return {
      level,
      levelLabel: level === "es" ? "Elementary" : level === "ms" ? "Middle" : "High",
      name,
      grade: (a[gradeField[level]] as string) ?? null,
      rating: r?.rating ?? null,
      gsUrl: r?.gs ?? gsSearchUrl(name),
    };
  } catch {
    return null;
  }
}

export async function getAssignedSchools(
  lat: number,
  lng: number
): Promise<AssignedSchool[]> {
  const [es, ms, hs] = await Promise.all([
    queryPoint("es", lat, lng),
    queryPoint("ms", lat, lng),
    queryPoint("hs", lat, lng),
  ]);
  return [es, ms, hs].filter(Boolean) as AssignedSchool[];
}

// Full catchment polygons for a level, as GeoJSON (for map overlays).
const geoCache = new Map<Level, { at: number; data: unknown }>();
const GEO_TTL = 1000 * 60 * 60 * 24;

export async function getCatchmentGeoJSON(level: Level): Promise<unknown> {
  const hit = geoCache.get(level);
  if (hit && Date.now() - hit.at < GEO_TTL) return hit.data;
  const url =
    `${ARCGIS}/${LAYER[level]}/FeatureServer/0/query?` +
    `where=1=1&outFields=${nameField[level]},${gradeField[level]}&f=geojson`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  const data = await res.json();
  geoCache.set(level, { at: Date.now(), data });
  return data;
}
