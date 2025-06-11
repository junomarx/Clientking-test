import { Package } from "lucide-react";

export function OrdersTab() {
  console.log('OrdersTab: Component is rendering');
  
  // Test direct API call
  fetch('/api/repairs/waiting-for-parts', {
    headers: {
      'X-User-ID': localStorage.getItem('userId') || '54'
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('OrdersTab: API data received:', data);
  })
  .catch(err => {
    console.error('OrdersTab: API error:', err);
  });
  
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
      </div>
      
      <div className="bg-blue-100 p-4 rounded mb-4">
        <p>DEBUG: Component is rendering</p>
        <p>Check browser console for API response</p>
      </div>
    </div>
  );
}