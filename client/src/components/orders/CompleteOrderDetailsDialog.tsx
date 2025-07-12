import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { 
  X, 
  Package, 
  User, 
  Calendar, 
  Euro, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  FileText, 
  Tag, 
  Clipboard,
  Settings,
  ChevronDown
} from 'lucide-react';

interface OrderItem {
  id: number;
  articleName?: string;
  partName?: string;
  quantity: number;
  status: string;
  unitPrice?: string;
  totalPrice?: string;
  downPayment?: string;
  type?: string;
  supplier?: string;
  repairId?: number;
  customerId?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  zipCode?: string;
  city?: string;
  createdAt: string;
}

interface CompleteOrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  type: 'spare-part' | 'accessory';
}

export function CompleteOrderDetailsDialog({ isOpen, onClose, order, type }: CompleteOrderDetailsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const isAccessory = type === 'accessory';
  
  if (!isOpen || !order) return null;

  const orderName = isAccessory ? order.articleName : order.partName;

  // Kundendaten laden
  useEffect(() => {
    const fetchCustomer = async () => {
      if (order.customerId && isOpen) {
        setLoadingCustomer(true);
        try {
          const response = await apiRequest('GET', `/api/customers/${order.customerId}`);
          if (response.ok) {
            const customerData = await response.json();
            setCustomer(customerData);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Kundendaten:', error);
        } finally {
          setLoadingCustomer(false);
        }
      } else {
        setCustomer(null);
      }
    };

    fetchCustomer();
  }, [order.customerId, isOpen]);

  // Status-Update-Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (isAccessory) {
        const response = await apiRequest('PUT', `/api/orders/accessories/bulk-update`, {
          accessoryIds: [order.id],
          status: newStatus
        });
        return response.json();
      } else {
        const response = await apiRequest('PUT', `/api/orders/spare-parts/bulk-update`, {
          sparePartIds: [order.id],
          status: newStatus
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/accessories'] });
      toast({
        title: "Status aktualisiert",
        description: "Der Status wurde erfolgreich geändert",
      });
      setShowStatusDropdown(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Status konnte nicht geändert werden",
        variant: "destructive",
      });
    }
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  const statusOptions = [
    { value: 'bestellen', label: 'Bestellen', color: 'bg-red-100 text-red-800' },
    { value: 'bestellt', label: 'Bestellt', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'eingetroffen', label: 'Eingetroffen', color: 'bg-blue-100 text-blue-800' },
    { value: 'erledigt', label: 'Erledigt', color: 'bg-green-100 text-green-800' }
  ];

  const currentStatus = statusOptions.find(s => s.value === order.status) || statusOptions[0];

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
    } catch {
      return 'Unbekannt';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return 'Unbekannt';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">
                {isAccessory ? 'Zubehör Details' : 'Ersatzteil Details'}
              </h2>
              <p className="text-gray-500 text-sm">Vollständige Bestellinformationen</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kundendaten */}
          <div className="bg-slate-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              Kundendaten
            </h3>
            
            {loadingCustomer ? (
              <div className="text-gray-500 italic">Kundendaten werden geladen...</div>
            ) : customer ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-gray-400" />
                  <div>
                    <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                    <div className="text-sm text-gray-500">Kunde seit {formatDate(customer.createdAt)}</div>
                  </div>
                </div>
                
                {customer.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-gray-400" />
                    <div>{customer.phone}</div>
                  </div>
                )}
                
                {customer.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-gray-400" />
                    <div>{customer.email}</div>
                  </div>
                )}
                
                {(customer.address || customer.zipCode || customer.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      {customer.address && <div>{customer.address}</div>}
                      {(customer.zipCode || customer.city) && (
                        <div>{customer.zipCode} {customer.city}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : order.customerId ? (
              <div className="text-gray-500 italic">Kunde nicht gefunden</div>
            ) : (
              <div className="text-gray-500 italic">Lager-Bestellung (kein Kunde zugeordnet)</div>
            )}
          </div>

          {/* Artikel-Informationen */}
          <div className="bg-slate-50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-green-600" />
              Artikel-Informationen
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 mt-1 text-gray-400" />
                <div>
                  <div className="font-medium">{orderName}</div>
                  <div className="text-sm text-gray-500">
                    {isAccessory ? 'Zubehör-Artikel' : 'Ersatzteil'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-1 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Menge</div>
                  <div className="font-medium">{order.quantity}x</div>
                </div>
              </div>

              {isAccessory && (
                <>
                  <div className="flex items-start gap-3">
                    <Euro className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Einzelpreis</div>
                      <div className="font-medium">€{order.unitPrice}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Euro className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Gesamtpreis</div>
                      <div className="font-medium">€{order.totalPrice}</div>
                    </div>
                  </div>

                  {order.downPayment && (
                    <div className="flex items-start gap-3">
                      <Euro className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Anzahlung</div>
                        <div className="font-medium">€{order.downPayment}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Tag className="h-4 w-4 mt-1 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Typ</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        order.type === 'kundenbestellung' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.type === 'kundenbestellung' ? 'Kundenbestellung' : 'Lager'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!isAccessory && order.supplier && (
                <div className="flex items-start gap-3">
                  <Settings className="h-4 w-4 mt-1 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Lieferant</div>
                    <div className="font-medium">{order.supplier}</div>
                  </div>
                </div>
              )}

              {!isAccessory && order.repairId && (
                <div className="flex items-start gap-3">
                  <Clipboard className="h-4 w-4 mt-1 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Reparatur-ID</div>
                    <div className="font-medium">#{order.repairId}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status und Zeitstempel */}
          <div className="bg-slate-50 rounded-lg p-4 border lg:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-purple-600" />
              Status und Zeitstempel
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-1 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Aktueller Status</div>
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${currentStatus.color} hover:opacity-80 transition-colors`}
                      disabled={updateStatusMutation.isPending}
                    >
                      {currentStatus.label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-32">
                        {statusOptions.map((status) => (
                          <button
                            key={status.value}
                            onClick={() => handleStatusChange(status.value)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm first:rounded-t-md last:rounded-b-md"
                            disabled={updateStatusMutation.isPending}
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Erstellt</div>
                  <div className="font-medium">{formatDate(order.createdAt)}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-1 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Letzte Änderung</div>
                  <div className="font-medium">{formatDateTime(order.updatedAt || order.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notizen */}
          {order.notes && (
            <div className="bg-slate-50 rounded-lg p-4 border lg:col-span-2">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-orange-600" />
                Notizen
              </h3>
              <div className="whitespace-pre-wrap text-gray-700">{order.notes}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}