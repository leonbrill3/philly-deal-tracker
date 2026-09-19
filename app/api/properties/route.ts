import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

export async function GET() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.address || typeof body.address !== "string") {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  // Geocode unless caller already supplied coordinates
  let lat = body.lat != null ? Number(body.lat) : null;
  let lng = body.lng != null ? Number(body.lng) : null;
  if (lat == null || lng == null) {
    const geo = await geocodeAddress(body.address);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const property = await prisma.property.create({
    data: {
      address: body.address,
      neighborhood: body.neighborhood || "Fishtown",
      propertyType: body.propertyType || "Land",
      status: body.status || "Watching",
      price: body.price != null && body.price !== "" ? Number(body.price) : null,
      sizeText: body.sizeText || null,
      zoning: body.zoning || null,
      mls: body.mls || null,
      listingUrl: body.listingUrl || null,
      brokerName: body.brokerName || null,
      brokerContact: body.brokerContact || null,
      addedBy: body.addedBy || null,
      notes: body.notes || null,
      lat,
      lng,
    },
  });

  return NextResponse.json(property, { status: 201 });
}
