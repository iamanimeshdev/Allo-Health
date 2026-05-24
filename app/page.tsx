import ProductGrid from "@/components/ProductGrid";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
          Products
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Reserve inventory temporarily during checkout. Stock is held for 10
          minutes.
        </p>
      </div>

      {/* Product grid */}
      <ProductGrid />
    </div>
  );
}
