import { Package } from "lucide-react";

export function OrdersTab() {
  console.log('OrdersTab: Component is rendering');
  
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <p>Test: OrdersTab is working</p>
      </div>
    </div>
  );
}