import React from 'react';
import { X } from 'lucide-react';

interface SimpleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  type: 'spare-part' | 'accessory';
}

export function SimpleOrderModal({ isOpen, onClose, order, type }: SimpleOrderModalProps) {
  if (!isOpen || !order) return null;

  const isAccessory = type === 'accessory';
  const orderName = isAccessory ? order.articleName : order.partName;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isAccessory ? 'Zubehör Details' : 'Ersatzteil Details'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="font-medium text-gray-700">Artikel:</label>
            <p>{orderName}</p>
          </div>
          
          <div>
            <label className="font-medium text-gray-700">Menge:</label>
            <p>{order.quantity}x</p>
          </div>
          
          <div>
            <label className="font-medium text-gray-700">Status:</label>
            <p className="capitalize">{order.status}</p>
          </div>
          
          {isAccessory && (
            <>
              <div>
                <label className="font-medium text-gray-700">Einzelpreis:</label>
                <p>€{order.unitPrice}</p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700">Gesamtpreis:</label>
                <p>€{order.totalPrice}</p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700">Typ:</label>
                <p>{order.type === 'kundenbestellung' ? 'Kundenbestellung' : 'Lager'}</p>
              </div>
            </>
          )}
          
          {!isAccessory && order.supplier && (
            <div>
              <label className="font-medium text-gray-700">Lieferant:</label>
              <p>{order.supplier}</p>
            </div>
          )}
          
          {order.notes && (
            <div>
              <label className="font-medium text-gray-700">Notizen:</label>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
          
          <div>
            <label className="font-medium text-gray-700">Erstellt:</label>
            <p>{new Date(order.createdAt).toLocaleDateString('de-DE')}</p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}