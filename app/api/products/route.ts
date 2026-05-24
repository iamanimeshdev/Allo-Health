import { NextResponse } from "next/server";
import { getProductsWithInventory } from "@/lib/inventory-service";

export async function GET() {
  try {
    const products = await getProductsWithInventory();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
