import { prisma } from "@/lib/prisma";
import { toDTO } from "@/lib/types";
import HomeClient from "./components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
  });
  const properties = rows.map(toDTO);
  return <HomeClient properties={properties} />;
}
