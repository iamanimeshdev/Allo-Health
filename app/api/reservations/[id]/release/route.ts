import { NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservation-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Simulating a cancellation or cart abandonment
    const reservation = await releaseReservation(id);

    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error(`Failed to release reservation:`, error);
    
    if (error.message.includes("not found") || error.message.includes("PENDING")) {
       return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
