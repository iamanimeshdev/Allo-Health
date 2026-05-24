"use client";

import { useState, useEffect, useCallback } from "react";

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

type Status =
  | "idle"
  | "reserving"
  | "reserved"
  | "confirming"
  | "confirmed"
  | "releasing"
  | "error";

interface Props {
  product: Product;
  onStockChange?: () => void;
}

export default function CheckoutFlow({ product, onStockChange }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pick the first warehouse with available stock
  const availableInventory = product.inventories.find(
    (inv) => inv.availableQuantity > 0
  );

  // Countdown timer
  useEffect(() => {
    if (!expiresAt || status !== "reserved") return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Expired");
        setStatus("idle");
        setReservationId(null);
        setExpiresAt(null);
        onStockChange?.();
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status, onStockChange]);

  const handleReserve = useCallback(async () => {
    if (!availableInventory) return;
    setStatus("reserving");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: availableInventory.id,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reserve");
      }

      setReservationId(data.id);
      setExpiresAt(new Date(data.expiresAt));
      setStatus("reserved");
      onStockChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reserve";
      setErrorMsg(message);
      setStatus("error");
    }
  }, [availableInventory, onStockChange]);

  const handleConfirm = useCallback(async () => {
    if (!reservationId) return;
    setStatus("confirming");

    try {
      const res = await fetch(
        `/api/reservations/${reservationId}/confirm`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm");
      setStatus("confirmed");
      onStockChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Confirmation failed";
      setErrorMsg(message);
      setStatus("error");
    }
  }, [reservationId, onStockChange]);

  const handleRelease = useCallback(async () => {
    if (!reservationId) return;
    setStatus("releasing");

    try {
      const res = await fetch(
        `/api/reservations/${reservationId}/release`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to release");
      }
      setStatus("idle");
      setReservationId(null);
      setExpiresAt(null);
      setErrorMsg(null);
      onStockChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Release failed";
      setErrorMsg(message);
      setStatus("error");
    }
  }, [reservationId, onStockChange]);

  // ─── Confirmed State ──────────────────────────────────
  if (status === "confirmed") {
    return (
      <div className="mt-4 animate-fade-in">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-medium text-emerald-700">
            Payment confirmed — stock permanently consumed
          </span>
        </div>
      </div>
    );
  }

  // ─── Reserved State (with countdown) ──────────────────
  if (status === "reserved" || status === "confirming" || status === "releasing") {
    const isUrgent =
      expiresAt && expiresAt.getTime() - Date.now() < 2 * 60 * 1000;

    return (
      <div className="mt-4 animate-slide-up">
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
          {/* Timer */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
              Reserved
            </span>
            <span
              className={`text-sm font-mono font-bold tabular-nums ${
                isUrgent
                  ? "text-red-600 animate-pulse-soft"
                  : "text-blue-700"
              }`}
            >
              ⏱ {countdown}
            </span>
          </div>

          <p className="text-xs text-blue-600">
            Stock is held for you. Complete payment or cancel to release.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={status === "confirming" || status === "releasing"}
              className="flex-1 bg-[var(--success)] text-white py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--success-hover)] active:scale-[0.98]"
            >
              {status === "confirming" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Confirming…
                </span>
              ) : (
                "Confirm Payment"
              )}
            </button>
            <button
              onClick={handleRelease}
              disabled={status === "confirming" || status === "releasing"}
              className="flex-1 border border-gray-300 bg-white text-gray-700 py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 active:scale-[0.98]"
            >
              {status === "releasing" ? "Releasing…" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Idle / Error State ───────────────────────────────
  return (
    <div className="mt-4">
      <button
        onClick={handleReserve}
        disabled={!availableInventory || status === "reserving"}
        className="w-full bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-medium disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[var(--primary-hover)] active:scale-[0.98]"
      >
        {status === "reserving" ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Reserving…
          </span>
        ) : !availableInventory ? (
          "Out of Stock"
        ) : (
          "Reserve & Checkout"
        )}
      </button>

      {errorMsg && (
        <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-fade-in">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span className="text-xs text-red-600">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
