import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const managers = await prisma.manager.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(managers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  // Idempotent: reuse an existing manager with the same name.
  const existing = await prisma.manager.findUnique({ where: { name } });
  if (existing) return NextResponse.json(existing);
  const manager = await prisma.manager.create({ data: { name } });
  return NextResponse.json(manager, { status: 201 });
}
