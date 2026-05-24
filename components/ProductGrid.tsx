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
import ProductImage from "@/components/ProductImage";
import HttpErrorAlert from "@/components/HttpErrorAlert";
import { parseApiError, type ApiError } from "@/lib/api-errors";

export default function ProductGrid() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<ApiError | null>(null);
  const [failedProductId, setFailedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
    setReserveError(null);
    setFailedProductId(null);

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

      if (!res.ok) {
        const apiError = await parseApiError(res, "Could not reserve this item.");
        setReserveError(apiError);
        setFailedProductId(product.id);
        setReservingId(null);
        return;
      }

      const data = await res.json();
      router.push(`/checkout/${data.id}`);
    } catch {
      setReserveError({
        status: 0,
        title: "Network error",
        message: "Could not reach the server. Check your connection and try again.",
      });
      setFailedProductId(product.id);
      setReservingId(null);
    }
  };

  const getCategory = (sku: string) => {
    if (sku.includes("BPM")) return { name: "Cardiology", bg: "bg-blue-50 text-blue-700 border-blue-100" };
    if (sku.includes("CPAP")) return { name: "Respiratory Care", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    if (sku.includes("BGM")) return { name: "Diabetes Care", bg: "bg-rose-50 text-rose-700 border-rose-100" };
    if (sku.includes("STETH")) return { name: "Diagnostics", bg: "bg-sky-50 text-sky-700 border-sky-100" };
    if (sku.includes("THERM")) return { name: "Clinical Temp", bg: "bg-amber-50 text-amber-700 border-amber-100" };
    if (sku.includes("OXIM")) return { name: "Pulmonary", bg: "bg-indigo-50 text-indigo-700 border-indigo-100" };
    if (sku.includes("WHEEL")) return { name: "Mobility Support", bg: "bg-purple-50 text-purple-700 border-purple-100" };
    if (sku.includes("FAK")) return { name: "Emergency Care", bg: "bg-red-50 text-red-700 border-red-100" };
    if (sku.includes("LAMP")) return { name: "Therapeutics", bg: "bg-orange-50 text-orange-700 border-orange-100" };
    return { name: "Clinical Equipment", bg: "bg-blue-50 text-blue-700 border-blue-100" };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[var(--border)] p-6 animate-pulse shadow-sm">
            <div className="w-full h-44 bg-gray-200 rounded-xl mb-4" />
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
      {reserveError && (
        <HttpErrorAlert
          error={reserveError}
          className="sticky top-14 z-[60]"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => {
          const category = getCategory(product.sku);
          return (
            <div
              key={product.id}
              className={`group bg-white rounded-2xl border p-5 flex flex-col h-full hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 animate-fade-in cursor-pointer ${
                failedProductId === product.id
                  ? "border-amber-400 ring-2 ring-amber-200"
                  : "border-[var(--border)]"
              }`}
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
              onClick={() => setSelectedProduct(product)}
            >
              {/* Product Image Section */}
              <div className="relative w-full h-44 bg-gray-50 rounded-xl overflow-hidden mb-4 border border-gray-100 flex items-center justify-center">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  fallbackClassName="text-4xl text-blue-600 animate-pulse"
                />
                {/* Available Badge overlay */}
                <div className="absolute top-2.5 right-2.5">
                  <StockBadge available={product.totalAvailable} />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${category.bg}`}>
                    ✚ {category.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">SKU: {product.sku}</span>
                </div>

                <h2 className="text-base font-bold text-[var(--foreground)] leading-snug group-hover:text-blue-700 transition mb-2">
                  {product.name}
                </h2>

                {product.description && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Price & Stock info */}
              <div className="mt-auto">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-xs text-gray-400">Price</span>
                  <div className="text-xl font-extrabold text-[var(--foreground)]">
                    ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-3.5 space-y-2 mb-4 border border-slate-100 text-xs">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 text-gray-400 font-medium">
                    <span>Clinical Facility</span>
                    <span>In Stock</span>
                  </div>
                  {product.inventories.map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center">
                      <span className="text-gray-600 truncate mr-2 font-medium">{inv.warehouseName.replace(" Medical Supply Hub", "").replace(" Clinical Storage Facility", "")}</span>
                      <span className={`font-bold tabular-nums ${inv.availableQuantity === 0 ? "text-red-500" : inv.availableQuantity <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                        {inv.availableQuantity}
                      </span>
                    </div>
                  ))}
                </div>

                {failedProductId === product.id && reserveError && (
                  <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                    <HttpErrorAlert error={reserveError} />
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReserve(product);
                  }}
                  disabled={product.totalAvailable === 0 || reservingId === product.id}
                  className="w-full bg-[var(--primary)] text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm disabled:bg-gray-150 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] active:scale-[0.98] transition duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  {reservingId === product.id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Securing stock…
                    </>
                  ) : product.totalAvailable === 0 ? (
                    "Not Available"
                  ) : (
                    "Reserve & Checkout"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Details Modal Overlay */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedProduct(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden border border-slate-100 flex flex-col transform transition-all animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {reserveError && failedProductId === selectedProduct.id && (
              <div className="p-4 border-b border-amber-200 bg-amber-50/80">
                <HttpErrorAlert error={reserveError} />
              </div>
            )}
            <div className="relative h-64 bg-slate-50 flex shrink-0 items-center justify-center border-b border-slate-100">
              <ProductImage
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
                fallbackClassName="text-6xl text-blue-600 animate-pulse"
              />
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 bg-white/80 backdrop-blur-md text-slate-500 hover:text-slate-800 p-2 rounded-full shadow-sm border border-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute bottom-4 right-4">
                <StockBadge available={selectedProduct.totalAvailable} />
              </div>
            </div>
            
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getCategory(selectedProduct.sku).bg}`}>
                  ✚ {getCategory(selectedProduct.sku).name}
                </span>
                <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100">SKU: {selectedProduct.sku}</span>
              </div>
              
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                {selectedProduct.name}
              </h2>
              
              <div className="text-2xl font-extrabold text-[var(--foreground)] mb-6">
                ₹{selectedProduct.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              
              {selectedProduct.description && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 uppercase tracking-wider">Product Details</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">Inventory Breakdown</h3>
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100/50 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Facility</th>
                        <th className="px-4 py-3 text-right">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProduct.inventories.map(inv => (
                        <tr key={inv.id} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {inv.warehouseName.replace(" Medical Supply Hub", "").replace(" Clinical Storage Facility", "")}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${inv.availableQuantity === 0 ? "text-red-500" : inv.availableQuantity <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                            {inv.availableQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleReserve(selectedProduct);
                  }}
                  disabled={selectedProduct.totalAvailable === 0 || reservingId === selectedProduct.id}
                  className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl text-sm font-semibold shadow-md disabled:bg-gray-150 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] active:scale-[0.98] transition duration-200 flex items-center justify-center gap-2"
                >
                  {reservingId === selectedProduct.id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Securing stock…
                    </>
                  ) : selectedProduct.totalAvailable === 0 ? (
                    "Not Available"
                  ) : (
                    "Reserve & Checkout"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">Out of Stock</span>;
  }
  if (available <= 5) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">Low Stock ({available})</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">Available</span>;
}
