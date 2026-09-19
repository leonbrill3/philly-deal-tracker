import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toDTO } from "@/lib/types";
import {
  TYPE_COLORS,
  STATUS_COLORS,
  NEIGHBORHOOD_THESIS,
  formatPrice,
} from "@/lib/constants";
import { getAssignedSchools } from "@/lib/schools";
import { ratingColor } from "@/lib/schoolRatings";
import AddToRankingButton from "@/app/components/AddToRankingButton";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const row = await prisma.property.findUnique({ where: { id } });
  if (!row) notFound();
  const p = toDTO(row);

  // Assigned public-school catchments + ratings (residential only)
  const schools =
    p.propertyType === "Residential" && p.lat != null && p.lng != null
      ? await getAssignedSchools(p.lat, p.lng)
      : [];

  const facts: [string, string | null][] = [
    ["Type", p.propertyType],
    ["Neighborhood", p.neighborhood],
    ["Size", p.sizeText],
    ["Zoning", p.zoning],
    ["MLS #", p.mls],
    ["Price / SF", pricePerSf(p.price, p.sizeText)],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-neutral-800"
      >
        ← Back to map
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: TYPE_COLORS[p.propertyType] ?? "#6b7280" }}
            />
            <span className="text-sm font-medium text-neutral-500">
              {p.propertyType}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ background: STATUS_COLORS[p.status] ?? "#6b7280" }}
            >
              {p.status}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">{p.address}</h1>
          <div className="mt-1 text-3xl font-bold">{formatPrice(p.price)}</div>
        </div>
        <div className="flex gap-2">
          {p.listingUrl && (
            <a
              href={p.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              View original listing ↗
            </a>
          )}
          {p.lat != null && p.lng != null && (
            <Link
              href={`/?focus=${p.id}`}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              📍 Show on map
            </Link>
          )}
          <Link
            href={`/properties/${p.id}/edit`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Facts */}
        <div className="space-y-4 md:col-span-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Details
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-neutral-400">{label}</dt>
                  <dd className="text-sm font-medium">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {p.notes && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">
                {p.notes}
              </p>
            </div>
          )}

          {schools.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                  Assigned schools
                </h2>
                <span className="text-[11px] text-neutral-400">
                  GreatSchools rating · School District of Philadelphia catchment
                </span>
              </div>
              <div className="space-y-2">
                {schools.map((s) => (
                  <div
                    key={s.level}
                    className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-white"
                      style={{ background: ratingColor(s.rating) }}
                      title="GreatSchools rating out of 10"
                    >
                      <span className="text-base font-bold leading-none">
                        {s.rating ?? "—"}
                      </span>
                      <span className="text-[8px] font-medium leading-none opacity-90">
                        /10
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                        {s.levelLabel}
                        {s.grade ? ` · ${s.grade}` : ""}
                      </div>
                      <div className="truncate text-sm font-medium text-neutral-900">
                        {s.name}
                      </div>
                    </div>
                    <a
                      href={s.gsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Details ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {NEIGHBORHOOD_THESIS[p.neighborhood] && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Why {p.neighborhood}
              </h2>
              <p className="text-sm text-neutral-700">
                {NEIGHBORHOOD_THESIS[p.neighborhood]}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Ranking
            </h2>
            <AddToRankingButton propertyId={p.id} />
            <Link
              href="/rankings"
              className="mt-2 block text-center text-xs text-neutral-400 hover:text-neutral-700"
            >
              View consensus leaderboard →
            </Link>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Broker
            </h2>
            <div className="text-sm">
              <div className="font-medium">{p.brokerName || "—"}</div>
              {p.brokerContact && (
                <div className="text-neutral-500">{p.brokerContact}</div>
              )}
            </div>
          </div>

          {p.lat != null && p.lng != null && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Location
              </h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open in Google Maps ↗
              </a>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-white p-5 text-xs text-neutral-400">
            {p.addedBy && <div>Added by {p.addedBy}</div>}
            <div>Added {new Date(p.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pricePerSf(price: number | null, sizeText: string | null): string | null {
  if (price == null || !sizeText) return null;
  const m = sizeText.replace(/,/g, "").match(/([\d.]+)\s*(sf|sqft|sq ft)/i);
  if (!m) return null;
  const sf = parseFloat(m[1]);
  if (!sf) return null;
  return "$" + Math.round(price / sf).toLocaleString("en-US") + "/SF";
}
