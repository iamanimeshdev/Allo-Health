import CheckoutFlow, { Product } from "@/components/CheckoutFlow";
import { getProductsWithInventory } from "@/lib/inventory-service";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch data directly from service since this is a server component
  const products = await getProductsWithInventory();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Allo Health - Electronics</h1>
          <p className="text-gray-500 mt-2">Temporary Reservation System MVP</p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border p-5 flex flex-col h-full">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">{product.name}</h2>
                <div className="text-sm text-gray-500 mb-4">{product.sku}</div>
                <div className="text-2xl font-bold text-gray-900 mb-4">${product.price.toFixed(2)}</div>
                
                <div className="bg-gray-50 rounded p-3 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Available Stock:</span>
                    <span className={`text-lg font-bold ${product.totalAvailable > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {product.totalAvailable}
                    </span>
                  </div>
                  {product.inventories.map((inv) => (
                    <div key={inv.id} className="flex justify-between text-xs text-gray-500">
                      <span>{inv.warehouseName}</span>
                      <span>{inv.availableQuantity} units</span>
                    </div>
                  ))}
                </div>
              </div>

              <CheckoutFlow product={product as any} />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
