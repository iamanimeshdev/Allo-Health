import { NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Simulating a payment success callback
    const reservation = await confirmReservation(id);

    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error(`Failed to confirm reservation:`, error);
    
    if (error.message.includes("not found") || error.message.includes("PENDING")) {
       return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
