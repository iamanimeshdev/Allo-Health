import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutDetails from "@/components/CheckoutDetails";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      inventory: {
        include: {
          product: true,
          warehouse: true,
        },
      },
    },
  });

  if (!reservation) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">Secure Inventory Hold</span>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight mt-3">Checkout / Reservation Page</h1>
      </div>
      
      <CheckoutDetails reservation={reservation} />
    </div>
  );
}
