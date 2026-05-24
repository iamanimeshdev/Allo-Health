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

import { getPusherClient } from "@/lib/pusher-client";
import HttpErrorAlert from "@/components/HttpErrorAlert";
import { parseApiError, type ApiError } from "@/lib/api-errors";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [actionError, setActionError] = useState<ApiError | null>(null);

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
    
    const pusher = getPusherClient();
    if (pusher) {
      const channel = pusher.subscribe("inventory");
      channel.bind("stock-update", () => {
        fetchReservations();
      });

      return () => {
        pusher.unsubscribe("inventory");
      };
    } else {
      // Fallback to polling if pusher is not configured
      const interval = setInterval(fetchReservations, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchReservations]);

  const handleConfirm = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (!res.ok) {
        setActionError(await parseApiError(res, "Failed to confirm reservation."));
        if (res.status === 410) fetchReservations();
        return;
      }
      fetchReservations();
    } catch {
      setActionError({
        status: 0,
        title: "Network error",
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  };

  const handleRelease = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        setActionError(await parseApiError(res, "Failed to release reservation."));
        return;
      }
      fetchReservations();
    } catch {
      setActionError({
        status: 0,
        title: "Network error",
        message: "Could not reach the server. Check your connection and try again.",
      });
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
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">Inventory Registry</span>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight mt-3">
            Clinical Reservations Registry
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed">
            Monitor hospital supply reservations, active inventory holdings, and lock statuses across facilities.
          </p>
        </div>
        <button
          onClick={fetchReservations}
          className="text-sm cursor-pointer bg-white border border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition duration-200"
        >
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          Sync Data
        </button>
      </div>

      {actionError && (
        <div className="mb-6">
          <HttpErrorAlert error={actionError} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-6 bg-slate-100 border border-slate-200 rounded-xl p-1 w-fit select-none">
        {(["ALL", "PENDING", "CONFIRMED", "RELEASED", "EXPIRED"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition duration-200 ${
                filter === tab
                  ? "bg-white text-blue-900 border border-slate-200/50 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab === "ALL" ? "All Logs" : tab}
              <span className={`ml-1.5 px-1.5 py-0.5 text-[9px] rounded-md font-bold leading-none ${filter === tab ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
                {counts[tab]}
              </span>
            </button>
          )
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--border)] p-5 animate-pulse shadow-sm"
            >
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[var(--border)] rounded-2xl p-8 text-[var(--muted)] shadow-sm">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-blue-200"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12h8.953m0 0L12 10.5M11.203 12L12 13.5M21.75 12h-8.953m0 0L12 10.5M12.797 12L12 13.5M12 12V2.25m0 9.75V21.75"
            />
          </svg>
          <p className="text-sm font-semibold">
            No {filter === "ALL" ? "" : filter.toLowerCase()} reservations found in registry
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5 hover:border-blue-300 hover:shadow-md transition-all duration-300 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="text-base font-bold text-[var(--foreground)] truncate">
              {r.inventory.product.name}
            </span>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
            <span className="font-semibold text-slate-500">Qty: {r.quantity}</span>
            <span>•</span>
            <span className="bg-slate-50 px-2 py-0.5 border border-slate-100 rounded text-slate-600 font-medium">🏥 {r.inventory.warehouse.name.replace(" Medical Supply Hub", "").replace(" Clinical Storage Facility", "")}</span>
            <span>•</span>
            <span className="font-medium">
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
                  className={`font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                    timeLeft === "Expired"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-blue-50 text-blue-600 border border-blue-100 animate-pulse-soft"
                  }`}
                >
                  ⏱ {timeLeft}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ID & Actions */}
        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
          <code className="text-[10px] text-gray-400 font-mono hidden lg:block bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
            ID: {r.id.slice(0, 12)}…
          </code>

          {r.status === "PENDING" && timeLeft !== "Expired" && (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm(r.id)}
                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
              >
                Confirm
              </button>
              <button
                onClick={() => onRelease(r.id)}
                className="px-3.5 py-1.5 text-xs font-bold border-2 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Release
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: "bg-blue-50 text-blue-700 border-blue-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RELEASED: "bg-slate-100 text-slate-600 border-slate-200",
    EXPIRED: "bg-rose-50 text-rose-600 border-rose-200",
  }[status] || "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${config}`}
    >
      {status}
    </span>
  );
}
