// Production seed: loads prisma/seed-data.json into the database on first
// deploy (only if the properties table is empty). Idempotent — safe to run on
// every deploy; it no-ops once data exists.
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.property.count();
  if (count > 0) {
    console.log(`DB already has ${count} properties — skipping seed.`);
    return;
  }
  const path = new URL("./seed-data.json", import.meta.url);
  if (!fs.existsSync(path)) {
    console.log("No seed-data.json found — starting empty.");
    return;
  }
  const { properties, managers, rankings } = JSON.parse(
    fs.readFileSync(path, "utf8")
  );

  for (const p of properties) {
    await prisma.property.create({
      data: {
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }
  for (const m of managers) {
    await prisma.manager.create({
      data: { ...m, createdAt: new Date(m.createdAt) },
    });
  }
  for (const r of rankings) {
    await prisma.ranking.create({
      data: { ...r, createdAt: new Date(r.createdAt) },
    });
  }
  console.log(
    `Seeded ${properties.length} properties, ${managers.length} managers, ${rankings.length} rankings.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
