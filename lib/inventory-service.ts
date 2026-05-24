/**
 * Inventory Service
 *
 * Read-only operations for querying product inventory and stock levels.
 */

import { prisma } from "./prisma";

export interface WarehouseInventory {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string | null;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface ProductWithInventory {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  sku: string;
  inventories: WarehouseInventory[];
  totalAvailable: number;
}

/**
 * Fetches all products with their inventory across all warehouses.
 * Calculates available stock (total - reserved) for each location.
 */
export async function getProductsWithInventory(): Promise<
  ProductWithInventory[]
> {
  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  type ProductRow = (typeof products)[number];

  return products.map((product: ProductRow) => {
    type InventoryRow = ProductRow["inventories"][number];
    const inventories: WarehouseInventory[] = product.inventories.map(
      (inv: InventoryRow) => ({
        id: inv.id,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location,
        totalQuantity: inv.totalQuantity,
        reservedQuantity: inv.reservedQuantity,
        availableQuantity: inv.totalQuantity - inv.reservedQuantity,
      })
    );

    const totalAvailable = inventories.reduce(
      (sum: number, inv: WarehouseInventory) => sum + inv.availableQuantity,
      0
    );

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      sku: product.sku,
      inventories,
      totalAvailable,
    };
  });
}

/**
 * Fetches all warehouses with their inventory counts.
 */
export async function getWarehouses() {
  return prisma.warehouse.findMany({
    include: {
      inventories: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Gets a single inventory record with product and warehouse details.
 */
export async function getInventoryById(inventoryId: string) {
  return prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      product: true,
      warehouse: true,
    },
  });
}
