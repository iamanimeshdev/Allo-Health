/**
 * Reservation Service
 *
 * Handles the core reservation lifecycle:
 * - Create (with row-level locking for concurrency safety)
 * - Confirm (permanently consume stock)
 * - Release (return reserved stock)
 * - Expire (cleanup stale reservations)
 *
 * All mutations use PostgreSQL transactions with SELECT ... FOR UPDATE
 * to prevent overselling under concurrent access.
 */

import { prisma } from "./prisma";
import type { ReservationStatus } from "@/app/generated/prisma/client";

const RESERVATION_TTL_MINUTES = parseInt(
  process.env.RESERVATION_TTL_MINUTES || "10",
  10
);

export interface CreateReservationInput {
  inventoryId: string;
  quantity: number;
}

export interface ReservationResult {
  success: boolean;
  reservation?: {
    id: string;
    inventoryId: string;
    quantity: number;
    status: ReservationStatus;
    expiresAt: Date;
    createdAt: Date;
  };
  error?: string;
  statusCode?: number;
}

interface ServiceError {
  statusCode: number;
  message: string;
}

function isServiceError(error: unknown): error is ServiceError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "message" in error
  );
}

/**
 * Creates a reservation using an atomic PostgreSQL transaction with row-level locking.
 *
 * Strategy:
 * 1. BEGIN transaction
 * 2. SELECT ... FOR UPDATE on inventory row (acquires exclusive row lock)
 * 3. Calculate available = totalQuantity - reservedQuantity
 * 4. If insufficient → ROLLBACK, return 409
 * 5. INCREMENT reservedQuantity
 * 6. INSERT reservation row
 * 7. COMMIT
 *
 * This guarantees that if 2 requests attempt to reserve the final unit simultaneously,
 * exactly ONE succeeds and the other gets HTTP 409.
 */
export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationResult> {
  const { inventoryId, quantity } = input;

  if (quantity <= 0) {
    return {
      success: false,
      error: "Quantity must be greater than 0",
      statusCode: 400,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Lock the inventory row with SELECT ... FOR UPDATE
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          totalQuantity: number;
          reservedQuantity: number;
        }>
      >`
        SELECT id, "totalQuantity", "reservedQuantity"
        FROM "Inventory"
        WHERE id = ${inventoryId}
        FOR UPDATE
      `;

      const inventory = rows[0];

      if (!inventory) {
        throw { statusCode: 404, message: "Inventory not found" } as ServiceError;
      }

      // Step 2: Calculate available stock
      const available = inventory.totalQuantity - inventory.reservedQuantity;

      if (available < quantity) {
        throw {
          statusCode: 409,
          message: `Insufficient stock. Available: ${available}, Requested: ${quantity}`,
        } as ServiceError;
      }

      // Step 3: Atomically increment reservedQuantity
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { reservedQuantity: { increment: quantity } },
      });

      // Step 4: Create reservation with expiry
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
      );

      const reservation = await tx.reservation.create({
        data: {
          inventoryId,
          quantity,
          status: "PENDING",
          expiresAt,
        },
      });

      return reservation;
    });

    return {
      success: true,
      reservation: result,
    };
  } catch (error: unknown) {
    if (isServiceError(error)) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    throw error;
  }
}

/**
 * Confirms a pending reservation, permanently consuming stock.
 *
 * On confirm:
 *   reservedQuantity -= qty  (reservation no longer held)
 *   totalQuantity -= qty     (stock permanently consumed)
 *   status = CONFIRMED
 */
export async function confirmReservation(
  reservationId: string
): Promise<ReservationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the reservation's inventory row
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw { statusCode: 404, message: "Reservation not found" } as ServiceError;
      }

      if (reservation.status === "CONFIRMED") {
        return reservation; // Idempotent
      }

      if (reservation.status !== "PENDING") {
        throw {
          statusCode: 410,
          message: `Reservation is ${reservation.status.toLowerCase()} and cannot be confirmed`,
        } as ServiceError;
      }

      // Check expiry — lazy expiry handling
      if (reservation.expiresAt < new Date()) {
        // Auto-expire: release inventory and mark expired
        await tx.inventory.update({
          where: { id: reservation.inventoryId },
          data: { reservedQuantity: { decrement: reservation.quantity } },
        });

        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: "EXPIRED", releasedAt: new Date() },
        });

        throw { statusCode: 410, message: "Reservation expired" } as ServiceError;
      }

      // Lock inventory row
      await tx.$queryRaw`
        SELECT id FROM "Inventory"
        WHERE id = ${reservation.inventoryId}
        FOR UPDATE
      `;

      // Permanently consume stock
      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          reservedQuantity: { decrement: reservation.quantity },
          totalQuantity: { decrement: reservation.quantity },
        },
      });

      // Mark confirmed
      const confirmed = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      return confirmed;
    });

    return { success: true, reservation: result };
  } catch (error: unknown) {
    if (isServiceError(error)) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    throw error;
  }
}

/**
 * Releases a pending reservation, returning stock to available pool.
 *
 * On release:
 *   reservedQuantity -= qty
 *   status = RELEASED
 */
export async function releaseReservation(
  reservationId: string
): Promise<ReservationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw { statusCode: 404, message: "Reservation not found" } as ServiceError;
      }

      if (reservation.status !== "PENDING") {
        throw {
          statusCode: 400,
          message: `Only PENDING reservations can be released. Current: ${reservation.status}`,
        } as ServiceError;
      }

      // Lock inventory row
      await tx.$queryRaw`
        SELECT id FROM "Inventory"
        WHERE id = ${reservation.inventoryId}
        FOR UPDATE
      `;

      // Release reserved stock
      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      });

      const released = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      return released;
    });

    return { success: true, reservation: result };
  } catch (error: unknown) {
    if (isServiceError(error)) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    throw error;
  }
}

/**
 * Expires all stale PENDING reservations.
 * Called by cron job or lazy cleanup.
 *
 * Finds all PENDING reservations where expiresAt < now,
 * decrements reservedQuantity, and marks as EXPIRED.
 */
export async function expireStaleReservations(): Promise<number> {
  const now = new Date();

  const staleReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
  });

  let expiredCount = 0;

  for (const reservation of staleReservations) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-check status inside transaction (may have been confirmed/released)
        const current = await tx.reservation.findUnique({
          where: { id: reservation.id },
        });

        if (!current || current.status !== "PENDING") return;

        // Lock inventory row
        await tx.$queryRaw`
          SELECT id FROM "Inventory"
          WHERE id = ${current.inventoryId}
          FOR UPDATE
        `;

        await tx.inventory.update({
          where: { id: current.inventoryId },
          data: { reservedQuantity: { decrement: current.quantity } },
        });

        await tx.reservation.update({
          where: { id: current.id },
          data: { status: "EXPIRED", releasedAt: now },
        });
      });

      expiredCount++;
    } catch (error) {
      console.error(
        `Failed to expire reservation ${reservation.id}:`,
        error
      );
    }
  }

  return expiredCount;
}
