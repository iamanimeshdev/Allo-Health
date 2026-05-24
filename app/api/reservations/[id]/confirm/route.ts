import { NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation-service";
import { getRedisOptional } from "@/lib/redis";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const idempotencyKey = _request.headers.get("Idempotency-Key");
    const redis = getRedisOptional();

    if (idempotencyKey && redis) {
      const cachedResponse = await redis.get(`idempotency:confirm:${idempotencyKey}`);
      if (cachedResponse) {
        return NextResponse.json(cachedResponse);
      }
    }

    const { id } = await params;
    const result = await confirmReservation(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 500 }
      );
    }

    if (idempotencyKey && redis && result.reservation) {
      await redis.set(`idempotency:confirm:${idempotencyKey}`, result.reservation, { ex: 86400 });
    }

    return NextResponse.json(result.reservation);
  } catch (error) {
    console.error("Failed to confirm reservation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
