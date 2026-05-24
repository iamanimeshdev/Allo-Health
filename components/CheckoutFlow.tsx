"use client";

import { useState } from "react";

export type Product = {
  id: string;
  name: string;
  price: number;
  totalAvailable: number;
  inventories: { id: string; warehouseName: string; availableQuantity: number }[];
};

export default function CheckoutFlow({ product }: { product: Product }) {
  const [status, setStatus] = useState<"idle" | "reserving" | "reserved" | "confirming" | "confirmed" | "error">("idle");
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // For MVP, we reserve 1 quantity from the first available warehouse.
  const availableInventory = product.inventories.find(inv => inv.availableQuantity > 0);

  const handleCheckout = async () => {
    if (!availableInventory) return;
    setStatus("reserving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId: availableInventory.id, quantity: 1 }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to reserve");
      }
      
      setReservationId(data.id);
      setStatus("reserved");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const handleConfirm = async () => {
    if (!reservationId) return;
    setStatus("confirming");
    try {
      const res = await fetch(`/api/reservations/${reservationId}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to confirm");
      setStatus("confirmed");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const handleCancel = async () => {
    if (!reservationId) return;
    try {
      await fetch(`/api/reservations/${reservationId}/release`, { method: "POST" });
      setStatus("idle");
      setReservationId(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (status === "confirmed") {
    return <div className="text-green-600 font-medium">✅ Purchase Successful!</div>;
  }

  return (
    <div className="mt-4">
      {status === "idle" || status === "error" || status === "reserving" ? (
        <>
          <button
            onClick={handleCheckout}
            disabled={!availableInventory || status === "reserving"}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition hover:bg-blue-700"
          >
            {status === "reserving" ? "Reserving..." : "Checkout Now"}
          </button>
          {errorMsg && <div className="mt-2 text-red-500 text-sm">{errorMsg}</div>}
        </>
      ) : (
        <div className="space-y-3 border p-4 rounded bg-blue-50">
          <div className="text-sm font-medium text-blue-800">
            Hold secured! You have 10 minutes to complete payment.
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleConfirm}
              disabled={status === "confirming"}
              className="flex-1 bg-green-600 text-white py-2 rounded font-medium disabled:bg-gray-400 transition hover:bg-green-700"
            >
              {status === "confirming" ? "Confirming..." : "Simulate Payment"}
            </button>
            <button
              onClick={handleCancel}
              disabled={status === "confirming"}
              className="flex-1 border border-gray-300 bg-white text-gray-700 py-2 rounded font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
