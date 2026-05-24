import { NextResponse } from "next/server";
import { createReservation } from "@/lib/reservation-service";
import { z } from "zod";

const createReservationSchema = z.object({
  inventoryId: z.string(),
  quantity: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createReservationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.format() },
        { status: 400 }
      );
    }

    const { inventoryId, quantity } = result.data;

    // The service throws a specific error message if stock is insufficient
    const reservation = await createReservation({ inventoryId, quantity });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    console.error("Reservation failed:", error);
    
    // Check if it's the specific insufficient stock error from our service
    if (error.message === "Insufficient available stock") {
      return NextResponse.json(
        { error: "Insufficient stock. Could not reserve item." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
