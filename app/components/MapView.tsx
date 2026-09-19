"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  MapControl,
  ControlPosition,
  useMap,
} from "@vis.gl/react-google-maps";
import Link from "next/link";
import { Property } from "@/lib/types";
import { TYPE_COLORS, formatPrice } from "@/lib/constants";
import {
  AMENITY_CATEGORIES,
  AmenityCategory,
  AmenityPlace,
} from "@/lib/amenities";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

type Selected =
  | { kind: "property"; data: Property }
  | { kind: "amenity"; cat: AmenityCategory; data: AmenityPlace }
  | null;

export default function MapView({
  properties,
  focusId,
  focusNonce = 0,
}: {
  properties: Property[];
  focusId?: string;
  focusNonce?: number;
}) {
  const located = properties.filter((p) => p.lat != null && p.lng != null);
  const center = located.length
    ? {
        lat:
          located.reduce((s, p) => s + (p.lat as number), 0) / located.length,
        lng:
          located.reduce((s, p) => s + (p.lng as number), 0) / located.length,
      }
    : { lat: 39.9683, lng: -75.1319 };

  const [selected, setSelected] = useState<Selected>(null);

  if (!API_KEY) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-500">
        Google Maps API key is not set. Add{" "}
        <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your
        environment.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <APIProvider apiKey={API_KEY}>
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Property markers */}
          {located.map((p) => (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat as number, lng: p.lng as number }}
              onClick={() => setSelected({ kind: "property", data: p })}
              zIndex={10}
            >
              <Pin
                background={TYPE_COLORS[p.propertyType] ?? "#6b7280"}
                borderColor="#ffffff"
                glyphColor="#ffffff"
              />
            </AdvancedMarker>
          ))}

          {/* Staple / amenity layers (self-contained; reads the viewport) */}
          <AmenityLayer
            onSelect={(cat, data) =>
              setSelected({ kind: "amenity", cat, data })
            }
          />

          {/* School catchment (zone) overlays */}
          <SchoolZones />

          {/* Pan/zoom to a property when requested from the list or a deep link */}
          <FocusController
            focusId={focusId}
            focusNonce={focusNonce}
            located={located}
            onFocus={(p) => setSelected({ kind: "property", data: p })}
          />

          {selected && (
            <InfoWindow
              position={
                selected.kind === "property"
                  ? {
                      lat: selected.data.lat as number,
                      lng: selected.data.lng as number,
                    }
                  : { lat: selected.data.lat, lng: selected.data.lng }
              }
              onCloseClick={() => setSelected(null)}
              pixelOffset={[0, -36]}
            >
              {selected.kind === "property" ? (
                <div className="min-w-[190px] p-1">
                  <div className="text-sm font-semibold text-neutral-900">
                    {selected.data.address}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {selected.data.propertyType} · {selected.data.neighborhood}
                  </div>
                  <div className="mt-1 text-base font-bold text-neutral-900">
                    {formatPrice(selected.data.price)}
                  </div>
                  {selected.data.sizeText && (
                    <div className="text-xs text-neutral-500">
                      {selected.data.sizeText}
                    </div>
                  )}
                  <Link
                    href={`/properties/${selected.data.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              ) : (
                <div className="min-w-[180px] p-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    {selected.cat.emoji} {selected.cat.label}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-neutral-900">
                    {selected.data.name}
                  </div>
                  {selected.data.address && (
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {selected.data.address}
                    </div>
                  )}
                  {selected.data.rating != null && (
                    <div className="mt-0.5 text-xs text-amber-600">
                      ★ {selected.data.rating}
                      {selected.data.reviews != null && (
                        <span className="text-neutral-400">
                          {" "}
                          ({selected.data.reviews.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  {selected.data.mapsUri && (
                    <a
                      href={selected.data.mapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                </div>
              )}
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

function AmenityLayer({
  onSelect,
}: {
  onSelect: (cat: AmenityCategory, place: AmenityPlace) => void;
}) {
  const map = useMap();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, AmenityPlace[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (cat: AmenityCategory) => {
      let lat = 39.969;
      let lng = -75.134;
      let radius = 3000;
      const c = map?.getCenter();
      const b = map?.getBounds();
      if (c) {
        lat = c.lat();
        lng = c.lng();
      }
      if (b) {
        const ne = b.getNorthEast();
        radius = Math.min(haversine(lat, lng, ne.lat(), ne.lng()), 50000);
      }
      const params = new URLSearchParams({
        cat: cat.key,
        lat: String(lat),
        lng: String(lng),
        radius: String(Math.round(radius)),
      });
      const res = await fetch(`/api/amenities?${params}`);
      if (!res.ok) return [];
      const j = await res.json();
      return (j.places ?? []) as AmenityPlace[];
    },
    [map]
  );

  const fetchInto = useCallback(
    async (cat: AmenityCategory) => {
      setLoading((l) => new Set(l).add(cat.key));
      const places = await load(cat);
      setData((d) => ({ ...d, [cat.key]: places }));
      setLoading((l) => {
        const n = new Set(l);
        n.delete(cat.key);
        return n;
      });
    },
    [load]
  );

  const toggle = useCallback(
    async (cat: AmenityCategory) => {
      const willActivate = !active.has(cat.key);
      setActive((prev) => {
        const next = new Set(prev);
        if (next.has(cat.key)) next.delete(cat.key);
        else next.add(cat.key);
        return next;
      });
      if (willActivate && !data[cat.key]) await fetchInto(cat);
    },
    [active, data, fetchInto]
  );

  const allOn = AMENITY_CATEGORIES.every((c) => active.has(c.key));
  const toggleAll = useCallback(async () => {
    if (allOn) {
      setActive(new Set());
      return;
    }
    setActive(new Set(AMENITY_CATEGORIES.map((c) => c.key)));
    await Promise.all(
      AMENITY_CATEGORIES.filter((c) => !data[c.key]).map((c) => fetchInto(c))
    );
  }, [allOn, data, fetchInto]);

  return (
    <>
      {AMENITY_CATEGORIES.filter((c) => active.has(c.key)).flatMap((c) =>
        (data[c.key] ?? []).map((a) => (
          <AdvancedMarker
            key={`${c.key}-${a.id}`}
            position={{ lat: a.lat, lng: a.lng }}
            onClick={() => onSelect(c, a)}
            zIndex={5}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-sm shadow"
              style={{ background: c.color }}
              title={a.name}
            >
              <span>{c.emoji}</span>
            </div>
          </AdvancedMarker>
        ))
      )}

      <MapControl position={ControlPosition.TOP_LEFT}>
        <div className="m-2">
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white/95 px-3 py-1.5 text-sm font-semibold text-neutral-800 shadow-lg backdrop-blur hover:bg-white"
            >
              <span>📍</span>
              <span>Key locations</span>
              {active.size > 0 && (
                <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {active.size}
                </span>
              )}
              <span className="text-neutral-400">▾</span>
            </button>
          ) : (
            <div className="max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur">
              <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  Key locations
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleAll}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      allOn
                        ? "border-transparent bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {allOn ? "Clear all" : "★ Show all"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    title="Collapse"
                    aria-label="Collapse"
                    className="rounded-full px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex max-w-[420px] flex-wrap gap-1.5">
                {AMENITY_CATEGORIES.map((cat) => {
                  const on = active.has(cat.key);
                  const busy = loading.has(cat.key);
                  return (
                    <button
                      key={cat.key}
                      onClick={() => toggle(cat)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        on
                          ? "border-transparent text-white"
                          : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
                      }`}
                      style={on ? { background: cat.color } : undefined}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      {busy && <span className="animate-pulse">…</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </MapControl>
    </>
  );
}

type ZoneLevel = "es" | "ms" | "hs";
const ZONE_META: Record<
  ZoneLevel,
  { label: string; color: string; field: string }
> = {
  es: { label: "Elementary", color: "#2563eb", field: "es_name" },
  ms: { label: "Middle", color: "#7c3aed", field: "ms_name" },
  hs: { label: "High", color: "#db2777", field: "hs_name" },
};

function SchoolZones() {
  const map = useMap();
  const [active, setActive] = useState<Set<ZoneLevel>>(new Set());
  const [busy, setBusy] = useState<Set<ZoneLevel>>(new Set());
  const layers = useRef<Record<string, google.maps.Data>>({});
  const info = useRef<google.maps.InfoWindow | null>(null);

  const toggle = useCallback(
    async (level: ZoneLevel) => {
      if (!map) return;
      if (active.has(level)) {
        layers.current[level]?.setMap(null);
        delete layers.current[level];
        setActive((p) => {
          const n = new Set(p);
          n.delete(level);
          return n;
        });
        return;
      }
      setActive((p) => new Set(p).add(level));
      setBusy((p) => new Set(p).add(level));
      try {
        const meta = ZONE_META[level];
        const geo = await (
          await fetch(`/api/catchments?level=${level}`)
        ).json();
        const data = new google.maps.Data();
        data.addGeoJson(geo);
        data.setStyle({
          fillColor: meta.color,
          fillOpacity: 0.07,
          strokeColor: meta.color,
          strokeWeight: 1.3,
          clickable: true,
        });
        data.addListener("click", (e: google.maps.Data.MouseEvent) => {
          const name = e.feature.getProperty(meta.field) as string;
          if (!info.current) info.current = new google.maps.InfoWindow();
          info.current.setContent(
            `<div style="font-size:12px;padding:2px"><b>${name ?? "School"}</b><br><span style="color:#666">${meta.label} catchment</span></div>`
          );
          if (e.latLng) info.current.setPosition(e.latLng);
          info.current.open(map);
        });
        data.setMap(map);
        layers.current[level] = data;
      } finally {
        setBusy((p) => {
          const n = new Set(p);
          n.delete(level);
          return n;
        });
      }
    },
    [map, active]
  );

  return (
    <MapControl position={ControlPosition.LEFT_BOTTOM}>
      <div className="m-2 rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-lg backdrop-blur">
        <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          School zones
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(ZONE_META) as ZoneLevel[]).map((lvl) => {
            const on = active.has(lvl);
            const b = busy.has(lvl);
            const meta = ZONE_META[lvl];
            return (
              <button
                key={lvl}
                onClick={() => toggle(lvl)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  on
                    ? "border-transparent text-white"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
                style={on ? { background: meta.color } : undefined}
              >
                {meta.label}
                {b && <span className="animate-pulse">…</span>}
              </button>
            );
          })}
        </div>
      </div>
    </MapControl>
  );
}

function FocusController({
  focusId,
  focusNonce,
  located,
  onFocus,
}: {
  focusId?: string;
  focusNonce: number;
  located: Property[];
  onFocus: (p: Property) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !focusId) return;
    const p = located.find((x) => x.id === focusId);
    if (!p || p.lat == null || p.lng == null) return;
    map.panTo({ lat: p.lat, lng: p.lng });
    map.setZoom(17);
    onFocus(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, focusId, map]);
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
