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
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Checkout</h1>
      </div>
      
      <CheckoutDetails reservation={reservation} />
    </div>
  );
}
