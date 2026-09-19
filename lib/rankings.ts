import { prisma } from "./prisma";
import { Property, toDTO } from "./types";

export type Manager = { id: string; name: string };

export type LeaderboardRow = {
  property: Property;
  points: number; // Borda points summed across managers
  voters: number; // how many managers shortlisted it
  positions: Record<string, number>; // managerId -> that manager's placement
};

// Borda scoring: within a manager's list of length N, position p (1-based)
// earns (N - p + 1) points. #1 on a long, considered list is worth the most,
// and being ranked by many managers compounds. Ties broken by voter count,
// then by best average placement.
export async function getLeaderboard(): Promise<{
  managers: Manager[];
  rows: LeaderboardRow[];
}> {
  const [managers, rankings] = await Promise.all([
    prisma.manager.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.ranking.findMany({ include: { property: true } }),
  ]);

  // list length per manager
  const listLen: Record<string, number> = {};
  for (const r of rankings) listLen[r.managerId] = (listLen[r.managerId] ?? 0) + 1;

  const byProp = new Map<
    string,
    {
      property: Property;
      points: number;
      voters: number;
      positions: Record<string, number>;
      posSum: number;
    }
  >();

  for (const r of rankings) {
    const N = listLen[r.managerId];
    const pts = N - r.position + 1;
    let entry = byProp.get(r.propertyId);
    if (!entry) {
      entry = {
        property: toDTO(r.property),
        points: 0,
        voters: 0,
        positions: {},
        posSum: 0,
      };
      byProp.set(r.propertyId, entry);
    }
    entry.points += pts;
    entry.voters += 1;
    entry.positions[r.managerId] = r.position;
    entry.posSum += r.position;
  }

  const rows = [...byProp.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.voters - a.voters ||
      a.posSum / a.voters - b.posSum / b.voters
  );

  return {
    managers: managers.map((m) => ({ id: m.id, name: m.name })),
    rows: rows.map(({ property, points, voters, positions }) => ({
      property,
      points,
      voters,
      positions,
    })),
  };
}
