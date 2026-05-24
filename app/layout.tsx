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
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="https://media.allohealth.care/allo-logo-v1.png"
                alt="Allo Health Logo"
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="font-bold text-[var(--foreground)] tracking-tight group-hover:text-[var(--primary)] flex items-center gap-1.5">
                Allo <span className="text-[var(--primary)] font-medium text-sm px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md">Health Portal</span>
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:translate-y-[-1px] font-medium transition"
              >
                Products Directory
              </Link>
              <Link
                href="/reservations"
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:translate-y-[-1px] font-medium transition"
              >
                Reservations Registry
              </Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] bg-white/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Allo Health — Clinical Supply & Inventory Reservation System
            </span>
            <span>
              Secure locking via{" "}
              <code className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold">
                SELECT ... FOR UPDATE
              </code>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
