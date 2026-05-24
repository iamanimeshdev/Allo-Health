"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  imageUrl: string | null;
  totalAvailable: number;
  inventories: {
    id: string;
    warehouseName: string;
    warehouseLocation: string | null;
    availableQuantity: number;
    totalQuantity: number;
    reservedQuantity: number;
  }[];
};

import { getPusherClient } from "@/lib/pusher-client";

export default function ProductGrid() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    
    const pusher = getPusherClient();
    if (pusher) {
      const channel = pusher.subscribe("inventory");
      channel.bind("stock-update", () => {
        fetchProducts(); // Refresh on event
      });

      return () => {
        pusher.unsubscribe("inventory");
      };
    }
  }, [fetchProducts]);

  const handleReserve = async (product: Product) => {
    const availableInventory = product.inventories.find((inv) => inv.availableQuantity > 0);
    if (!availableInventory) return;

    setReservingId(product.id);
    setErrorMsg(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          inventoryId: availableInventory.id,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reserve");
      }

      router.push(`/checkout/${data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setReservingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[var(--border)] p-6 animate-pulse">
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
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-[var(--border)] p-6 flex flex-col h-full hover:shadow-md hover:border-gray-300 animate-fade-in"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
          >
            <div className="flex-1">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-semibold text-[var(--foreground)] leading-tight">{product.name}</h2>
                <StockBadge available={product.totalAvailable} />
              </div>

              <p className="text-xs text-[var(--muted)] font-mono mb-2">{product.sku}</p>

              {product.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
              )}

              <div className="text-2xl font-bold text-[var(--foreground)] mb-4">
                ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 mb-6">
                <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Warehouse</span>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Available</span>
                </div>
                {product.inventories.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate mr-2">{inv.warehouseName}</span>
                    <span className={`font-medium tabular-nums ${inv.availableQuantity === 0 ? "text-red-500" : inv.availableQuantity <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                      {inv.availableQuantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleReserve(product)}
              disabled={product.totalAvailable === 0 || reservingId === product.id}
              className="w-full bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-medium disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] active:scale-[0.98] transition"
            >
              {reservingId === product.id ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Reserving…
                </span>
              ) : product.totalAvailable === 0 ? (
                "Out of Stock"
              ) : (
                "Reserve & Checkout"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>;
  }
  if (available <= 5) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low: {available}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">In Stock</span>;
}
