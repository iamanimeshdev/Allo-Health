import { NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/reservation-service";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // This endpoint can be hit periodically (e.g. by a Vercel Cron job or similar)
    // to clean up all expired holds.
    const result = await expireStaleReservations();

    return NextResponse.json({
      success: true,
      message: "Expired holds cleaned up successfully",
      releasedCount: result
    });
  } catch (error) {
    console.error("Failed to run expire cron:", error);
    return NextResponse.json(
      { error: "Internal server error during expiry cleanup" },
      { status: 500 }
    );
  }
}
