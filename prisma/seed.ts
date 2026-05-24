import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ProductRecord {
  id: string;
  name: string;
}

interface WarehouseRecord {
  id: string;
  name: string;
}

interface InventoryRecord {
  id: string;
  productId: string;
  warehouseId: string;
  totalQuantity: number;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clean existing data ───────────────────────────────
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // ─── Create Products ───────────────────────────────────
  const products: ProductRecord[] = await Promise.all([
    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5 Wireless Headphones",
        description:
          "Industry-leading noise cancellation with Auto NC Optimizer, crystal-clear hands-free calling, and up to 30-hour battery life.",
        price: 349.99,
        sku: "SONY-WH1000XM5",
        imageUrl: "/images/headphones.svg",
      },
    }),
    prisma.product.create({
      data: {
        name: "Logitech MX Ergo Keyboard",
        description:
          "Advanced wireless ergonomic keyboard with adjustable palm lift, smart backlighting, and multi-device connectivity via Bluetooth.",
        price: 199.99,
        sku: "LOGI-MXERGO-KB",
        imageUrl: "/images/keyboard.svg",
      },
    }),
    prisma.product.create({
      data: {
        name: "CalDigit TS4 USB-C Hub",
        description:
          "18-port Thunderbolt 4 dock with 98W charging, 2.5GbE, and dual 6K display support. The ultimate desk companion.",
        price: 449.99,
        sku: "CALD-TS4-HUB",
        imageUrl: "/images/usbhub.svg",
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // ─── Create Warehouses ─────────────────────────────────
  const warehouses: WarehouseRecord[] = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Mumbai Central Warehouse",
        location: "Parel, Mumbai, Maharashtra 400012",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Delhi NCR Distribution Hub",
        location: "Sector 63, Noida, Uttar Pradesh 201301",
      },
    }),
  ]);

  console.log(`✅ Created ${warehouses.length} warehouses`);

  // ─── Create Inventory ──────────────────────────────────
  // Intentionally low stock on USB-C Hub for concurrency testing
  const inventoryData = [
    // Sony Headphones - moderate stock
    {
      productId: products[0].id,
      warehouseId: warehouses[0].id,
      totalQuantity: 75,
      reservedQuantity: 0,
    },
    {
      productId: products[0].id,
      warehouseId: warehouses[1].id,
      totalQuantity: 50,
      reservedQuantity: 0,
    },
    // MX Ergo Keyboard - decent stock
    {
      productId: products[1].id,
      warehouseId: warehouses[0].id,
      totalQuantity: 40,
      reservedQuantity: 0,
    },
    {
      productId: products[1].id,
      warehouseId: warehouses[1].id,
      totalQuantity: 30,
      reservedQuantity: 0,
    },
    // USB-C Hub - VERY LOW stock (for testing concurrency conflicts)
    {
      productId: products[2].id,
      warehouseId: warehouses[0].id,
      totalQuantity: 3,
      reservedQuantity: 0,
    },
    {
      productId: products[2].id,
      warehouseId: warehouses[1].id,
      totalQuantity: 2,
      reservedQuantity: 0,
    },
  ];

  const inventories: InventoryRecord[] = await Promise.all(
    inventoryData.map((data) => prisma.inventory.create({ data }))
  );

  console.log(`✅ Created ${inventories.length} inventory records`);

  // ─── Summary ───────────────────────────────────────────
  console.log("\n📦 Inventory Summary:");
  for (const inv of inventories) {
    const product = products.find((p: ProductRecord) => p.id === inv.productId);
    const warehouse = warehouses.find(
      (w: WarehouseRecord) => w.id === inv.warehouseId
    );
    console.log(
      `   ${product?.name} @ ${warehouse?.name}: ${inv.totalQuantity} units`
    );
  }

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e: unknown) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
