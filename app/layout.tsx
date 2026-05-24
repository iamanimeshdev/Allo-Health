import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Allo Health — Inventory Reservation System",
  description:
    "Concurrency-safe temporary inventory reservation system with PostgreSQL row-level locking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">AH</span>
              </div>
              <span className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                Allo Health
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] font-medium"
              >
                Products
              </Link>
              <Link
                href="/reservations"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] font-medium"
              >
                Reservations
              </Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Allo Health — Inventory Reservation System</span>
            <span>
              Concurrency-safe with{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                SELECT ... FOR UPDATE
              </code>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
