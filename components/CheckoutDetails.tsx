"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProductImage from "@/components/ProductImage";
import HttpErrorAlert from "@/components/HttpErrorAlert";
import { parseApiError, type ApiError } from "@/lib/api-errors";

export default function CheckoutDetails({
  reservation,
}: {
  reservation: any;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(reservation.status);
  const [countdown, setCountdown] = useState<string>("");
  const [apiError, setApiError] = useState<ApiError | null>(null);

  // Generate an idempotency key once per component mount (for the confirm action)
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (status !== "PENDING") return;

    const expiresAt = new Date(reservation.expiresAt);
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Expired");
        setApiError({
          status: 410,
          title: "Reservation expired (410 Gone)",
          message:
            "Your hold timed out before checkout completed. Stock has been returned to the warehouse.",
        });
        setStatus("EXPIRED");
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, reservation.expiresAt]);

  const handleConfirm = useCallback(async () => {
    setStatus("confirming");
    setApiError(null);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });

      if (!res.ok) {
        const parsed = await parseApiError(res, "Failed to confirm purchase.");
        setApiError(parsed);
        if (res.status === 410) {
          setStatus("EXPIRED");
        } else {
          setStatus("PENDING");
        }
        return;
      }

      setStatus("CONFIRMED");
    } catch {
      setApiError({
        status: 0,
        title: "Network error",
        message: "Could not reach the server. Check your connection and try again.",
      });
      setStatus("PENDING");
    }
  }, [reservation.id, idempotencyKey]);

  const handleRelease = useCallback(async () => {
    setStatus("releasing");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        const parsed = await parseApiError(res, "Failed to cancel reservation.");
        setApiError(parsed);
        setStatus("PENDING");
        return;
      }
      setStatus("RELEASED");
    } catch {
      setApiError({
        status: 0,
        title: "Network error",
        message: "Could not reach the server. Check your connection and try again.",
      });
      setStatus("PENDING");
    }
  }, [reservation.id]);

  if (status === "CONFIRMED") {
    return (
      <div className="bg-white border-2 border-emerald-100 rounded-2xl p-8 text-center animate-fade-in shadow-md">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Purchase Confirmed!</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">Your reservation was successfully finalized, stock has been permanently allocated, and clinical processing has started.</p>
        <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition">
          Return to Medical Supplies Directory
        </button>
      </div>
    );
  }

  if (status === "RELEASED" || status === "EXPIRED") {
    return (
      <div className="bg-white border-2 border-rose-100 rounded-2xl p-8 text-center animate-fade-in shadow-md">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
          {status === "EXPIRED" ? "Hold Expired" : "Hold Cancelled"}
        </h2>
        {apiError && status === "EXPIRED" && (
          <div className="mb-4 max-w-md mx-auto text-left">
            <HttpErrorAlert error={apiError} />
          </div>
        )}
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          {status === "EXPIRED"
            ? "This reservation is no longer valid. Stock has been returned to the facility supply pool."
            : "The stock reservation has been released and returned to the facility supply pool."}
        </p>
        <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition">
          Return to Medical Supplies Directory
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl shadow-md overflow-hidden animate-fade-in">
      <div className="bg-blue-50 border-b border-blue-100 p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-250 mb-2 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Secured Clinical Inventory
          </span>
          <h2 className="text-lg font-bold text-blue-900">Complete your clinical requisition</h2>
          <p className="text-xs text-blue-700 mt-1">This medical item is held exclusively for you. Complete checkout before the timer expires.</p>
        </div>
        <div className="bg-white border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm select-none">
          <div className="text-right">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Time Remaining</div>
            <div className={`text-2xl font-mono font-extrabold tabular-nums transition ${countdown === "Expired" || countdown.startsWith("0:0") ? "text-rose-600 animate-pulse" : "text-blue-600"}`}>
              {countdown || "--:--"}
            </div>
          </div>
          <div className={`text-2xl animate-heartbeat`}>
            ⏱️
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="w-24 h-24 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
            <ProductImage
              src={reservation.inventory.product.imageUrl}
              alt={reservation.inventory.product.name}
              className="w-full h-full object-cover"
              fallbackClassName="text-3xl text-blue-600"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">🏥 {reservation.inventory.warehouse.name}</span>
            <h3 className="font-extrabold text-base text-slate-900 truncate leading-snug">{reservation.inventory.product.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">SKU: {reservation.inventory.product.sku} | Quantity: {reservation.quantity}</p>
            <div className="text-xl font-black text-slate-900 mt-2">₹{reservation.inventory.product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {apiError && (
          <div className="mb-6">
            <HttpErrorAlert error={apiError} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleConfirm}
            disabled={status === "confirming" || status === "releasing"}
            className="flex-1 cursor-pointer bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold py-3 rounded-xl shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {status === "confirming" ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Finalizing purchase…
              </>
            ) : (
              "Confirm purchase"
            )}
          </button>
          <button
            onClick={handleRelease}
            disabled={status === "confirming" || status === "releasing"}
            className="flex-1 cursor-pointer bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition duration-200 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
