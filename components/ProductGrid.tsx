"use client";

import { useState, useEffect, useCallback } from "react";
import CheckoutFlow from "@/components/CheckoutFlow";
import type { Product } from "@/components/CheckoutFlow";

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-[var(--border)] p-6 animate-pulse"
          >
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/3 mb-6" />
            <div className="h-7 bg-gray-200 rounded w-1/4 mb-6" />
            <div className="h-20 bg-gray-50 rounded mb-4" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--muted)]">No products found. Run the seed script.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="bg-white rounded-xl border border-[var(--border)] p-6 flex flex-col h-full hover:shadow-md hover:border-gray-300 animate-fade-in"
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
        >
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold text-[var(--foreground)] leading-tight">
                {product.name}
              </h2>
              <StockBadge available={product.totalAvailable} />
            </div>

            <p className="text-xs text-[var(--muted)] font-mono mb-2">
              {product.sku}
            </p>

            {product.description && (
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Price */}
            <div className="text-2xl font-bold text-[var(--foreground)] mb-4">
              ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>

            {/* Warehouse breakdown */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 mb-1">
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Warehouse
                </span>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Available
                </span>
              </div>
              {product.inventories.map((inv) => (
                <div
                  key={inv.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-600 truncate mr-2">
                    {inv.warehouseName}
                  </span>
                  <span
                    className={`font-medium tabular-nums ${
                      inv.availableQuantity === 0
                        ? "text-red-500"
                        : inv.availableQuantity <= 5
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {inv.availableQuantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <CheckoutFlow product={product} onStockChange={fetchProducts} />
        </div>
      ))}
    </div>
  );
}

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Out of Stock
      </span>
    );
  }
  if (available <= 5) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        Low: {available}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      In Stock
    </span>
  );
}
