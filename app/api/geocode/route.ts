import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address)
    return NextResponse.json({ error: "address required" }, { status: 400 });
  const geo = await geocodeAddress(address);
  if (!geo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(geo);
}
