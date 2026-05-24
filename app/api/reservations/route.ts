import { NextResponse } from "next/server";
import { createReservation } from "@/lib/reservation-service";
import { getRedisOptional } from "@/lib/redis";
import { z } from "zod";

const createReservationSchema = z.object({
  inventoryId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createReservationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.format() },
        { status: 400 }
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key");
    const redis = getRedisOptional();

    // 1. Check Idempotency Cache
    if (idempotencyKey && redis) {
      const cachedResponse = await redis.get(`idempotency:reservation:${idempotencyKey}`);
      if (cachedResponse) {
        return NextResponse.json(cachedResponse, { status: 201 });
      }
    }

    const result = await createReservation(validation.data);

    if (!result.success) {
      const status = result.statusCode || 500;
      return NextResponse.json(
        { error: result.error, statusCode: status },
        { status }
      );
    }

    // 2. Store Idempotency Result (24 hour TTL)
    if (idempotencyKey && redis && result.reservation) {
      await redis.set(`idempotency:reservation:${idempotencyKey}`, result.reservation, { ex: 86400 });
    }

    return NextResponse.json(result.reservation, { status: 201 });
  } catch (error) {
    console.error("Reservation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
