"use client";

import { useState, useEffect, useCallback } from "react";

interface Reservation {
  id: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  inventory: {
    id: string;
    product: { name: string; sku: string };
    warehouse: { name: string };
  };
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations/list");
      const data = await res.json();
      setReservations(data);
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchReservations, 5000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
      });
      if (res.ok) fetchReservations();
    } catch (error) {
      console.error("Confirm failed:", error);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      if (res.ok) fetchReservations();
    } catch (error) {
      console.error("Release failed:", error);
    }
  };

  const filtered =
    filter === "ALL"
      ? reservations
      : reservations.filter((r) => r.status === filter);

  const counts = {
    ALL: reservations.length,
    PENDING: reservations.filter((r) => r.status === "PENDING").length,
    CONFIRMED: reservations.filter((r) => r.status === "CONFIRMED").length,
    RELEASED: reservations.filter((r) => r.status === "RELEASED").length,
    EXPIRED: reservations.filter((r) => r.status === "EXPIRED").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
            Reservations
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Track all inventory holds and their lifecycle status.
          </p>
        </div>
        <button
          onClick={fetchReservations}
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(["ALL", "PENDING", "CONFIRMED", "RELEASED", "EXPIRED"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                filter === tab
                  ? "bg-white text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab}
              <span className="ml-1 text-[10px] opacity-60">
                {counts[tab]}
              </span>
            </button>
          )
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-[var(--border)] p-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
            />
          </svg>
          <p className="text-sm">
            No {filter === "ALL" ? "" : filter.toLowerCase()} reservations found
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <ReservationRow
              key={r.id}
              reservation={r}
              onConfirm={handleConfirm}
              onRelease={handleRelease}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationRow({
  reservation: r,
  onConfirm,
  onRelease,
}: {
  reservation: Reservation;
  onConfirm: (id: string) => void;
  onRelease: (id: string) => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (r.status !== "PENDING") return;

    const update = () => {
      const diff = new Date(r.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [r.status, r.expiresAt]);

  return (
    <div className="bg-white rounded-lg border border-[var(--border)] p-4 hover:border-gray-300 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[var(--foreground)] truncate">
              {r.inventory.product.name}
            </span>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            <span>Qty: {r.quantity}</span>
            <span>•</span>
            <span>{r.inventory.warehouse.name}</span>
            <span>•</span>
            <span>
              {new Date(r.createdAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {r.status === "PENDING" && timeLeft && (
              <>
                <span>•</span>
                <span
                  className={`font-mono font-medium ${
                    timeLeft === "Expired"
                      ? "text-red-500"
                      : "text-blue-600"
                  }`}
                >
                  ⏱ {timeLeft}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ID */}
        <code className="text-[10px] text-gray-400 font-mono hidden md:block">
          {r.id.slice(0, 12)}…
        </code>

        {/* Actions */}
        {r.status === "PENDING" && timeLeft !== "Expired" && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onConfirm(r.id)}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 active:scale-95"
            >
              Confirm
            </button>
            <button
              onClick={() => onRelease(r.id)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 active:scale-95"
            >
              Release
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    RELEASED: "bg-gray-100 text-gray-600",
    EXPIRED: "bg-red-100 text-red-600",
  }[status] || "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${config}`}
    >
      {status}
    </span>
  );
}
