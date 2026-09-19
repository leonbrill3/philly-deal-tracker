import { NextRequest, NextResponse } from "next/server";
import { getCatchmentGeoJSON, Level } from "@/lib/schools";

export async function GET(req: NextRequest) {
  const level = (req.nextUrl.searchParams.get("level") ?? "es") as Level;
  if (!["es", "ms", "hs"].includes(level))
    return NextResponse.json({ error: "bad level" }, { status: 400 });
  const data = await getCatchmentGeoJSON(level);
  return NextResponse.json(data);
}
