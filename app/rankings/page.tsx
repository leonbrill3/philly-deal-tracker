import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toDTO } from "@/lib/types";
import { getLeaderboard } from "@/lib/rankings";
import RankingsBoard from "@/app/components/RankingsBoard";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const [rowsRaw, board] = await Promise.all([
    prisma.property.findMany({ orderBy: { address: "asc" } }),
    getLeaderboard(),
  ]);
  const allProperties = rowsRaw.map(toDTO);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Back to map
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Rankings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each manager builds their own ranked shortlist of favorite deals. The
          consensus leaderboard combines everyone&apos;s picks.
        </p>
      </div>
      <RankingsBoard
        allProperties={allProperties}
        managers={board.managers}
        rows={board.rows}
      />
    </div>
  );
}
