import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Philly Deal Tracker",
  description:
    "Investment property tracker for Philadelphia — Fishtown, Northern Liberties, Washington Square, Graduate Hospital.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-neutral-50 text-neutral-900">
        <header className="sticky top-0 z-[1100] border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">
                Philly Deal Tracker
              </span>
              <span className="hidden rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:inline">
                Beta
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Map
              </Link>
              <Link
                href="/rankings"
                className="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Rankings
              </Link>
              <Link
                href="/properties/new"
                className="rounded-md bg-neutral-900 px-3 py-1.5 font-semibold text-white hover:bg-neutral-700"
              >
                + Add property
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 py-8 text-xs text-neutral-400">
          Philly Deal Tracker — private investment tracker. Data entered by you
          and your partners.
        </footer>
      </body>
    </html>
  );
}
