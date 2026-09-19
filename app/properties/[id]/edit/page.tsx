import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toDTO } from "@/lib/types";
import PropertyForm from "@/app/components/PropertyForm";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: PageProps<"/properties/[id]/edit">) {
  const { id } = await params;
  const row = await prisma.property.findUnique({ where: { id } });
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/properties/${id}`}
        className="text-sm text-neutral-500 hover:text-neutral-800"
      >
        ← Back to property
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">Edit property</h1>
      <PropertyForm initial={toDTO(row)} />
    </div>
  );
}
