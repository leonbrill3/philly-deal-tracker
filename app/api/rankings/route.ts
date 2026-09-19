import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDTO } from "@/lib/types";

// GET /api/rankings?managerId=... → that manager's ranked shortlist (ordered)
export async function GET(req: NextRequest) {
  const managerId = req.nextUrl.searchParams.get("managerId");
  if (!managerId)
    return NextResponse.json({ error: "managerId required" }, { status: 400 });
  const rows = await prisma.ranking.findMany({
    where: { managerId },
    orderBy: { position: "asc" },
    include: { property: true },
  });
  return NextResponse.json(
    rows.map((r) => ({ position: r.position, property: toDTO(r.property) }))
  );
}

// POST /api/rankings { managerId, propertyId } → append to the manager's list
export async function POST(req: NextRequest) {
  const { managerId, propertyId } = await req.json();
  if (!managerId || !propertyId)
    return NextResponse.json(
      { error: "managerId and propertyId required" },
      { status: 400 }
    );
  const existing = await prisma.ranking.findUnique({
    where: { managerId_propertyId: { managerId, propertyId } },
  });
  if (existing) return NextResponse.json(existing);
  const max = await prisma.ranking.aggregate({
    where: { managerId },
    _max: { position: true },
  });
  const ranking = await prisma.ranking.create({
    data: { managerId, propertyId, position: (max._max.position ?? 0) + 1 },
  });
  return NextResponse.json(ranking, { status: 201 });
}

// PUT /api/rankings { managerId, order: [propertyId,...] }
// Replaces the manager's full ordered list (handles reorder + removals).
export async function PUT(req: NextRequest) {
  const { managerId, order } = await req.json();
  if (!managerId || !Array.isArray(order))
    return NextResponse.json(
      { error: "managerId and order[] required" },
      { status: 400 }
    );
  await prisma.$transaction([
    prisma.ranking.deleteMany({ where: { managerId } }),
    ...order.map((propertyId: string, i: number) =>
      prisma.ranking.create({
        data: { managerId, propertyId, position: i + 1 },
      })
    ),
  ]);
  return NextResponse.json({ ok: true });
}

// DELETE /api/rankings?managerId=..&propertyId=..
export async function DELETE(req: NextRequest) {
  const managerId = req.nextUrl.searchParams.get("managerId");
  const propertyId = req.nextUrl.searchParams.get("propertyId");
  if (!managerId || !propertyId)
    return NextResponse.json(
      { error: "managerId and propertyId required" },
      { status: 400 }
    );
  await prisma.ranking
    .delete({ where: { managerId_propertyId: { managerId, propertyId } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
