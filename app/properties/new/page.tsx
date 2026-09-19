import Link from "next/link";
import PropertyForm from "@/app/components/PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-neutral-800"
      >
        ← Back to map
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">Add a property</h1>
      <PropertyForm />
    </div>
  );
}
