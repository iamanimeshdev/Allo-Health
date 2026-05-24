import { NextResponse } from "next/server";
import { createReservation } from "@/lib/reservation-service";
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

    const result = await createReservation(validation.data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 500 }
      );
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
