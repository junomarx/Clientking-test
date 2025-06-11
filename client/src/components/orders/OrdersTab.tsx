import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

export function OrdersTab() {
  console.log('OrdersTab: Starting render');
  
  const { data: repairsWaitingForParts = [], isLoading, error } = useQuery({
    queryKey: ['/api/repairs/waiting-for-parts'],
    refetchInterval: 30000,
  });

  console.log('OrdersTab: Query state:', { 
    dataLength: repairsWaitingForParts.length, 
    isLoading, 
    hasError: !!error 
  });

  if (isLoading) {
    console.log('OrdersTab: Rendering loading state');
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('OrdersTab: Rendering error state:', error);
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <div className="bg-red-100 p-4 rounded">
          <p>Error: {error?.message}</p>
        </div>
      </div>
    );
  }

  console.log('OrdersTab: Rendering data state with', repairsWaitingForParts.length, 'items');
  
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        <span className="bg-gray-200 px-2 py-1 rounded text-sm">
          {repairsWaitingForParts.length}
        </span>
      </div>
      
      <div className="bg-green-100 p-4 rounded mb-4">
        <p>SUCCESS: Found {repairsWaitingForParts.length} repairs waiting for parts</p>
        {repairsWaitingForParts.map((repair, index) => (
          <div key={repair.id} className="mt-2 p-2 bg-white rounded">
            <p><strong>{repair.orderCode}</strong> - {repair.customer.firstName} {repair.customer.lastName}</p>
            <p>{repair.deviceType} {repair.brand} {repair.model}</p>
            <p>Status: {repair.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}