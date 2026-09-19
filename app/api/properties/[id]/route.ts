import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(property);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Re-geocode if the address changed and no explicit coords were provided
  let lat = body.lat != null ? Number(body.lat) : existing.lat;
  let lng = body.lng != null ? Number(body.lng) : existing.lng;
  if (body.address && body.address !== existing.address && body.lat == null) {
    const geo = await geocodeAddress(body.address);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const property = await prisma.property.update({
    where: { id },
    data: {
      address: body.address ?? existing.address,
      neighborhood: body.neighborhood ?? existing.neighborhood,
      propertyType: body.propertyType ?? existing.propertyType,
      status: body.status ?? existing.status,
      price: !("price" in body)
        ? existing.price
        : body.price === "" || body.price == null
          ? null
          : Number(body.price),
      sizeText: body.sizeText ?? existing.sizeText,
      zoning: body.zoning ?? existing.zoning,
      mls: body.mls ?? existing.mls,
      listingUrl: body.listingUrl ?? existing.listingUrl,
      brokerName: body.brokerName ?? existing.brokerName,
      brokerContact: body.brokerContact ?? existing.brokerContact,
      addedBy: body.addedBy ?? existing.addedBy,
      notes: body.notes ?? existing.notes,
      lat,
      lng,
    },
  });

  return NextResponse.json(property);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.property.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
