import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Building2, Wrench, Users, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { Loader2 } from "lucide-react";

interface ShopDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shop: {
    id: number;
    shopId: number;
    shopName: string;
    name: string;
    metrics?: {
      totalRepairs: number;
      activeRepairs: number;
      completedRepairs: number;
      totalRevenue: number;
      monthlyRevenue: number;
      totalEmployees: number;
      pendingOrders: number;
    };
    grantedAt: string;
  } | null;
}

export function ShopDetailsDialog({ isOpen, onClose, shop }: ShopDetailsDialogProps) {
  // Lade Shop-spezifische Reparaturen
  const { data: repairs, isLoading: repairsLoading } = useQuery({
    queryKey: ['/api/repairs', shop?.shopId],
    enabled: isOpen && !!shop,
    queryFn: async () => {
      const response = await fetch('/api/repairs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Multi-Shop-Mode': 'true',
          'X-Selected-Shop-Id': shop!.shopId.toString(),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Reparaturen');
      }
      
      return response.json();
    }
  });

  // Lade Shop-spezifische Kunden
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/customers', shop?.shopId],
    enabled: isOpen && !!shop,
    queryFn: async () => {
      const response = await fetch('/api/customers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Multi-Shop-Mode': 'true',
          'X-Selected-Shop-Id': shop!.shopId.toString(),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Kunden');
      }
      
      return response.json();
    }
  });

  if (!shop) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'eingegangen':
        return 'bg-blue-100 text-blue-800';
      case 'in reparatur':
        return 'bg-yellow-100 text-yellow-800';
      case 'abholbereit':
        return 'bg-green-100 text-green-800';
      case 'abgeholt':
        return 'bg-gray-100 text-gray-800';
      case 'außer haus':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Building2 className="w-5 h-5" />
            <span className="truncate">{shop.shopName || shop.name || `Shop ${shop.shopId}`}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4 sm:space-y-6 pb-4">
            {/* Shop-Übersicht */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="w-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Reparaturen</p>
                      <p className="text-lg sm:text-2xl font-bold truncate">{shop.metrics?.totalRepairs || 0}</p>
                    </div>
                    <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="w-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Aktive</p>
                      <p className="text-lg sm:text-2xl font-bold truncate">{shop.metrics?.activeRepairs || 0}</p>
                    </div>
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="w-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Kunden</p>
                      <p className="text-lg sm:text-2xl font-bold truncate">{customers?.length || 0}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="w-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Mitarbeiter</p>
                      <p className="text-lg sm:text-2xl font-bold truncate">{shop.metrics?.totalEmployees || 0}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reparaturen Liste */}
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Reparaturen</CardTitle>
              </CardHeader>
              <CardContent>
                {repairsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Lade Reparaturen...</span>
                  </div>
                ) : repairs && repairs.length > 0 ? (
                  <div className="space-y-3">
                    {repairs.slice(0, 10).map((repair: any) => (
                      <div key={repair.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 sm:gap-4 w-full max-w-full overflow-hidden">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-medium text-sm sm:text-base truncate">{repair.orderCode}</span>
                            <Badge className={`${getStatusColor(repair.status)} text-xs`}>
                              {repair.status}
                            </Badge>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                            {repair.deviceType} - {repair.issue}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Kunde: {repair.customerName || 'Unbekannt'} • 
                            Erstellt: {new Date(repair.createdAt).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <div className="font-medium text-sm sm:text-base">
                            {repair.estimatedCost ? `€${repair.estimatedCost}` : 'Offen'}
                          </div>
                        </div>
                      </div>
                    ))}
                    {repairs.length > 10 && (
                      <div className="text-center py-2 text-muted-foreground">
                        ... und {repairs.length - 10} weitere
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Reparaturen vorhanden
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Kunden Liste */}
            <Card>
              <CardHeader>
                <CardTitle>Kunden</CardTitle>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Lade Kunden...</span>
                  </div>
                ) : customers && customers.length > 0 ? (
                  <div className="space-y-3">
                    {customers.slice(0, 5).map((customer: any) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {customer.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {customer.email}
                                </span>
                              )}
                              {customer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customers.length > 5 && (
                      <div className="text-center py-2 text-muted-foreground">
                        ... und {customers.length - 5} weitere
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Kunden vorhanden
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Mobile Close Button - direkt im Content */}
            <div className="sm:hidden mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
                size="lg"
              >
                Dialog schließen
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}