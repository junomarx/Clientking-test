import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { SparePart, Accessory, Customer, SelectUser } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Package,
  User,
  Calendar,
  Euro,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Tag,
  Clipboard,
  Pencil,
  AlertCircle,
  CheckSquare,
  Settings
} from 'lucide-react';

// Vereinter Order-Typ für Ersatzteile und Zubehör
export type OrderItem = (SparePart & { customerName?: string; type: 'spare-part' }) | 
                        (Accessory & { customerName?: string; type: 'accessory' });

interface StatusHistoryEntry {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  changedAt: string;
  changedByUsername: string | null;
  notes: string | null;
}

interface OrderDetailsDialogProps {
  order: OrderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'spare-part' | 'accessory';
}

export function OrderDetailsDialog({ order, open, onOpenChange, type }: OrderDetailsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [showStatusHistory, setShowStatusHistory] = useState(false);

  if (!order) return null;

  const isAccessory = type === 'accessory';
  const title = isAccessory ? 'Zubehör Details' : 'Ersatzteil Details';

  // Formatierungshilfsfunktionen
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  // Kundendaten laden
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (order.customerId && open) {
        try {
          const response = await apiRequest('GET', `/api/customers/${order.customerId}`);
          if (response.ok) {
            const customerData = await response.json();
            setCustomer(customerData);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Kundendaten:', error);
        }
      }
    };

    fetchCustomerData();
  }, [order.customerId, open]);

  // Status-Verlauf laden (Mock-Daten für jetzt)
  useEffect(() => {
    if (open) {
      // Simulierter Status-Verlauf basierend auf dem aktuellen Status
      const mockHistory: StatusHistoryEntry[] = [
        {
          id: 1,
          oldStatus: null,
          newStatus: 'bestellen',
          changedAt: order.createdAt.toString(),
          changedByUsername: user?.username || null,
          notes: 'Bestellung erstellt'
        }
      ];

      if (order.status !== 'bestellen') {
        mockHistory.push({
          id: 2,
          oldStatus: 'bestellen',
          newStatus: order.status,
          changedAt: order.updatedAt?.toString() || order.createdAt.toString(),
          changedByUsername: user?.username || null,
          notes: `Status geändert zu ${getStatusLabel(order.status)}`
        });
      }

      setStatusHistory(mockHistory);
    }
  }, [open, order, user]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'bestellen': return 'destructive';
      case 'bestellt': return 'secondary';
      case 'eingetroffen': return 'default';
      case 'erledigt': return 'default';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'bestellen': return 'Bestellen';
      case 'bestellt': return 'Bestellt';
      case 'eingetroffen': return 'Eingetroffen';
      case 'erledigt': return 'Erledigt';
      default: return status;
    }
  };

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
      // Cache invalidieren
      queryClient.invalidateQueries({ queryKey: ['/api/orders/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/accessories'] });
      toast({
        title: "Status aktualisiert",
        description: "Der Status wurde erfolgreich geändert",
      });
      onOpenChange(false);
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

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zur Bestellung und Kundendaten
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Kundendaten */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <User className="h-5 w-5" />
              Kundendaten
            </h3>
            
            {customer ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                  </div>
                </div>
                
                {customer.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>{customer.phone}</div>
                  </div>
                )}
                
                {customer.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>{customer.email}</div>
                  </div>
                )}
                
                {(customer.address || customer.zipCode || customer.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      {customer.address && <div>{customer.address}</div>}
                      {(customer.zipCode || customer.city) && (
                        <div>{customer.zipCode} {customer.city}</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>Kunde seit {formatDate(customer.createdAt.toString())}</div>
                </div>
              </div>
            ) : order.customerId ? (
              <div className="text-muted-foreground italic">Kundendaten werden geladen...</div>
            ) : (
              <div className="text-muted-foreground italic">Lager-Bestellung (kein Kunde zugeordnet)</div>
            )}
          </div>
          
          {/* Artikel-Informationen */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Package className="h-5 w-5" />
              Artikel-Informationen
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium">
                    {isAccessory ? (order as Accessory).articleName : (order as SparePart).partName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isAccessory ? 'Zubehör-Artikel' : 'Ersatzteil'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Menge</div>
                  <Badge variant="outline">{order.quantity}x</Badge>
                </div>
              </div>

              {isAccessory && (
                <>
                  <div className="flex items-start gap-2">
                    <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Einzelpreis</div>
                      <div className="font-medium">€ {(order as Accessory).unitPrice}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Gesamtpreis</div>
                      <div className="font-medium">€ {(order as Accessory).totalPrice}</div>
                    </div>
                  </div>

                  {(order as Accessory).downPayment && (
                    <div className="flex items-start gap-2">
                      <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="text-sm text-muted-foreground">Anzahlung</div>
                        <div>€ {(order as Accessory).downPayment}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Typ</div>
                      <Badge variant={order.type === 'kundenbestellung' ? 'default' : 'secondary'}>
                        {order.type === 'kundenbestellung' ? 'Kundenbestellung' : 'Lager'}
                      </Badge>
                    </div>
                  </div>
                </>
              )}

              {!isAccessory && (order as SparePart).supplier && (
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Lieferant</div>
                    <div>{(order as SparePart).supplier}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStatusHistory(!showStatusHistory)}
                      className="h-6 px-2 text-xs"
                    >
                      <History className="h-3 w-3 mr-1" />
                      Verlauf
                      {showStatusHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                  
                  {/* Aktueller Status */}
                  <Badge variant={getStatusBadgeVariant(order.status)} className="mb-2">
                    {getStatusLabel(order.status)}
                  </Badge>
                  
                  {/* Status-Verlauf */}
                  {showStatusHistory && (
                    <div className="mt-2 space-y-2 border-t pt-2">
                      {statusHistory.map((entry) => (
                        <div key={entry.id} className="text-xs bg-white p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {entry.oldStatus ? `${getStatusLabel(entry.oldStatus)} → ` : ''}
                              {getStatusLabel(entry.newStatus)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatDateTime(entry.changedAt)}
                            </span>
                          </div>
                          {entry.changedByUsername && (
                            <div className="text-muted-foreground mt-1">
                              von {entry.changedByUsername}
                            </div>
                          )}
                          {entry.notes && (
                            <div className="text-muted-foreground mt-1 italic">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {(order.notes || (isAccessory && (order as Accessory).notes)) && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Notizen</div>
                    <div className="whitespace-pre-wrap">
                      {order.notes || (isAccessory && (order as Accessory).notes)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Bestellinformationen */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Clipboard className="h-5 w-5" />
              Bestellinformationen
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Bestelldatum</div>
                  <div>{formatDate(order.createdAt.toString())}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Letzte Änderung</div>
                  <div>{formatDateTime((order.updatedAt || order.createdAt).toString())}</div>
                </div>
              </div>

              {!isAccessory && (order as SparePart).repairId && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Reparatur-ID</div>
                    <div>#{(order as SparePart).repairId}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-end">
          {/* Status-Aktionen */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={updateStatusMutation.isPending}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Status ändern
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {order.status !== 'bestellt' && (
                <DropdownMenuItem onClick={() => handleStatusChange('bestellt')}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Als bestellt markieren
                </DropdownMenuItem>
              )}
              {order.status !== 'eingetroffen' && (
                <DropdownMenuItem onClick={() => handleStatusChange('eingetroffen')}>
                  <Package className="h-4 w-4 mr-2" />
                  Als eingetroffen markieren
                </DropdownMenuItem>
              )}
              {order.status !== 'erledigt' && (
                <DropdownMenuItem onClick={() => handleStatusChange('erledigt')}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Als erledigt markieren
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={handleClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}