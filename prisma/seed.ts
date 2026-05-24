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
  console.log("🌱 Seeding database with healthcare/medical items...\n");

  // ─── Clean existing data ───────────────────────────────
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // ─── Create 10 Healthcare Products ─────────────────────
  const products: ProductRecord[] = await Promise.all([
    prisma.product.create({
      data: {
        name: "Advanced Clinical Blood Pressure Monitor",
        description: "Clinically validated, wireless blood pressure monitor that stores up to 200 readings for two users.",
        price: 8499.00,
        sku: "CLN-ADV-BPM",
        imageUrl: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Hospital-Grade Advanced CPAP Machine",
        description: "Automated positive airway pressure therapy device featuring integrated humidification and ultra-quiet motor technology.",
        price: 48999.00,
        sku: "HOS-ADV-CPAP",
        imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Instant Blood Glucose Testing Kit",
        description: "Instant blood glucose meter offering a target range indicator and seamless synchronization.",
        price: 1499.00,
        sku: "CLN-INST-BGM",
        imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Professional Cardiology Stethoscope",
        description: "Elite double-lumen cardiology stethoscope built from surgical stainless steel with highly sensitive acoustic diaphragms.",
        price: 9999.00,
        sku: "PRO-CARD-STETH",
        imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "No-Touch Clinical Forehead Thermometer",
        description: "Dual-technology medical thermometer that supports both physical contact and gentle touchless scanning. Safe for infants and seniors.",
        price: 3999.00,
        sku: "CLN-NT-THERM",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Vantage Finger Pulse Oximeter",
        description: "Scientific-grade finger pulse oximeter. Clinically proven accurate for oxygen saturation and pulse rate under low blood perfusion.",
        price: 4500.00,
        sku: "SCI-PULSE-OXIM",
        imageUrl: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Lightweight Folding Wheelchair",
        description: "Premium carbon steel folding manual wheelchair with dual-axle positioning, comfortable padded armrests, and swing-away leg rests.",
        price: 18500.00,
        sku: "CLN-LGT-WHEEL",
        imageUrl: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Hospital First Aid Kit (250pc)",
        description: "Complete emergency kit stocked with sterile gauze, wraps, skin sanitizers, cold packs, bandages, and CPR shields.",
        price: 2499.00,
        sku: "HOS-PREM-FAK",
        imageUrl: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Deep Infrared Heat Relief Lamp",
        description: "300W medically certified deep-penetrating infrared light designed to target muscle aches, joint stiffness, and back strain.",
        price: 5999.00,
        sku: "CLN-INF-LAMP",
        imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80",
      },
    }),
    prisma.product.create({
      data: {
        name: "Clinical Sleep Therapy CPAP",
        description: "Clinical sleep therapy system featuring built-in humidification, auto-set therapy tracking, and remote compliance monitoring.",
        price: 62000.00,
        sku: "CLN-SLP-CPAP",
        imageUrl: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=600&q=80",
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} healthcare products`);

  // ─── Create Warehouses ─────────────────────────────────
  const warehouses: WarehouseRecord[] = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Mumbai Central Medical Supply Hub",
        location: "Parel, Mumbai, Maharashtra 400012",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Delhi NCR Clinical Storage Facility",
        location: "Sector 63, Noida, Uttar Pradesh 201301",
      },
    }),
  ]);

  console.log(`✅ Created ${warehouses.length} medical warehouses`);

  // ─── Create Inventory ──────────────────────────────────
  // We'll generate inventory records for all 10 products.
  // Product #2 (Accu-Chek Instant Blood Glucose Meter - index 2) will have very low stock (3 and 2) for concurrency testing.
  const inventoryData = products.flatMap((product, idx) => {
    let qty1 = 2;
    let qty2 = 1;

    if (idx === 2) {
      // Very low stock item for testing race conditions
      qty1 = 1;
      qty2 = 0;
    } else if (idx === 0) {
      qty1 = 3;
      qty2 = 2;
    } else if (idx === 5) {
      qty1 = 1;
      qty2 = 1;
    } else if (idx === 9) {
      qty1 = 2;
      qty2 = 2;
    }

    return [
      {
        productId: product.id,
        warehouseId: warehouses[0].id,
        totalQuantity: qty1,
        reservedQuantity: 0,
      },
      {
        productId: product.id,
        warehouseId: warehouses[1].id,
        totalQuantity: qty2,
        reservedQuantity: 0,
      },
    ];
  });

  const inventories: InventoryRecord[] = await Promise.all(
    inventoryData.map((data) => prisma.inventory.create({ data }))
  );

  console.log(`✅ Created ${inventories.length} stock inventory records`);

  // ─── Summary ───────────────────────────────────────────
  console.log("\n📦 Clinical Stock Inventory Summary:");
  for (const inv of inventories) {
    const product = products.find((p: ProductRecord) => p.id === inv.productId);
    const warehouse = warehouses.find(
      (w: WarehouseRecord) => w.id === inv.warehouseId
    );
    console.log(
      `   ${product?.name} @ ${warehouse?.name}: ${inv.totalQuantity} units`
    );
  }

  console.log("\n✅ Database healthcare seeding complete!");
}

main()
  .catch((e: unknown) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
