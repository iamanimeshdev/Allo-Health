"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutDetails({
  reservation,
}: {
  reservation: any;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(reservation.status);
  const [countdown, setCountdown] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm payment");
      setStatus("CONFIRMED");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }, [reservation.id, idempotencyKey]);

  const handleRelease = useCallback(async () => {
    setStatus("releasing");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      setStatus("RELEASED");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }, [reservation.id]);

  if (status === "CONFIRMED") {
    return (
      <div className="bg-white border rounded-xl p-8 text-center animate-fade-in shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-600 mb-6">Your payment was successful and stock has been permanently secured.</p>
        <button onClick={() => router.push("/")} className="text-blue-600 font-medium hover:underline">
          Return to Store
        </button>
      </div>
    );
  }

  if (status === "RELEASED" || status === "EXPIRED") {
    return (
      <div className="bg-white border rounded-xl p-8 text-center animate-fade-in shadow-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === "EXPIRED" ? "Reservation Expired" : "Reservation Cancelled"}
        </h2>
        <p className="text-gray-600 mb-6">The item has been returned to the available stock pool.</p>
        <button onClick={() => router.push("/")} className="text-blue-600 font-medium hover:underline">
          Return to Store
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <div className="bg-blue-50 border-b border-blue-100 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-blue-900">Complete your purchase</h2>
          <p className="text-sm text-blue-700 mt-1">Stock is secured. Complete payment before the timer expires.</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-1">Time Remaining</div>
          <div className={`text-3xl font-mono font-bold tabular-nums ${countdown === "Expired" || countdown.startsWith("0:0") ? "text-red-600 animate-pulse" : "text-blue-600"}`}>
            {countdown || "--:--"}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            📦
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{reservation.inventory.product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">SKU: {reservation.inventory.product.sku}</p>
            <div className="text-xl font-bold">₹{reservation.inventory.product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMsg}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleConfirm}
            disabled={status === "confirming" || status === "releasing"}
            className="flex-1 bg-emerald-600 text-white font-semibold py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition active:scale-[0.98]"
          >
            {status === "confirming" ? "Confirming..." : "Pay Now"}
          </button>
          <button
            onClick={handleRelease}
            disabled={status === "confirming" || status === "releasing"}
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
