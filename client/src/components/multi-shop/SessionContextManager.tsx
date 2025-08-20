import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building2, 
  ArrowRightLeft, 
  Home, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  ArrowLeft,
  History
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface ShopContext {
  shopId: number | null;
  shopName: string | null;
  switchedAt: string | null;
  previousShopId: number | null;
}

interface AccessibleShop {
  id: number;
  name: string;
  businessName: string;
  shopId: number;
  grantedAt: string;
  isActive: boolean;
}

interface ContextHistory {
  shopId: number;
  shopName: string;
  switchedAt: string;
  duration: number; // in minutes
}

/**
 * Session-Context Manager für Multi-Shop Admins
 * Ermöglicht temporären Shop-Switch ohne permanente DB-Änderungen
 */
export function SessionContextManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShopId, setSelectedShopId] = useState<string>('');

  // Aktueller Session-Context
  const { data: currentContext, isLoading: loadingContext } = useQuery<ShopContext>({
    queryKey: ['/api/multi-shop/current-context'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/multi-shop/current-context');
      return response.json();
    },
    refetchInterval: 30000 // Alle 30 Sekunden aktualisieren
  });

  // Zugängliche Shops
  const { data: accessibleShops = [], isLoading: loadingShops } = useQuery<AccessibleShop[]>({
    queryKey: ['/api/multi-shop/accessible-shops'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/multi-shop/accessible-shops');
      return response.json();
    }
  });

  // Context-Historie
  const { data: contextHistory = [], isLoading: loadingHistory } = useQuery<ContextHistory[]>({
    queryKey: ['/api/multi-shop/context-history'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/multi-shop/context-history');
      return response.json();
    }
  });

  // Shop-Switch Mutation
  const switchShopMutation = useMutation({
    mutationFn: async (shopId: number) => {
      const response = await apiRequest('POST', `/api/multi-shop/switch-shop/${shopId}`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/current-context'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/context-history'] });
      
      // Invalidate alle Shop-spezifischen Daten
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings'] });
      
      toast({
        title: 'Shop-Kontext gewechselt',
        description: `Sie arbeiten nun im Kontext von "${data.shopName}".`,
        variant: 'default'
      });
      setSelectedShopId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler beim Shop-Wechsel',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Context-Reset Mutation
  const resetContextMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/multi-shop/reset-context');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/current-context'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/context-history'] });
      
      // Invalidate alle Shop-spezifischen Daten
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings'] });
      
      toast({
        title: 'Kontext zurückgesetzt',
        description: 'Sie befinden sich wieder im Standard Multi-Shop Admin Modus.',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler beim Zurücksetzen',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSwitchShop = () => {
    if (!selectedShopId) {
      toast({
        title: 'Shop auswählen',
        description: 'Bitte wählen Sie einen Shop aus.',
        variant: 'destructive'
      });
      return;
    }
    switchShopMutation.mutate(parseInt(selectedShopId));
  };

  const handleResetContext = () => {
    resetContextMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Aktueller Context Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Aktueller Shop-Kontext
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihren temporären Shop-Zugriff
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingContext ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              Lade Kontext-Status...
            </div>
          ) : currentContext?.shopId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-800">
                      {currentContext.shopName}
                    </div>
                    <div className="text-sm text-blue-600">
                      Gewechselt {currentContext.switchedAt ? 
                        formatDistanceToNow(new Date(currentContext.switchedAt), { 
                          addSuffix: true, 
                          locale: de 
                        }) : 'kürzlich'}
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-600">Aktiv</Badge>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Temporärer Zugriff</p>
                  <p className="text-amber-700">
                    Sie befinden sich im Kontext eines spezifischen Shops. Alle Daten und Aktionen 
                    beziehen sich auf diesen Shop.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleResetContext}
                variant="outline"
                disabled={resetContextMutation.isPending}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                {resetContextMutation.isPending ? 'Wird zurückgesetzt...' : 'Zum Multi-Shop Dashboard zurückkehren'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                <Home className="h-5 w-5" />
                <span>Standard Multi-Shop Admin Modus</span>
              </div>
              <p className="text-sm text-gray-600">
                Sie befinden sich derzeit im übergeordneten Multi-Shop Dashboard
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shop-Wechsel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-green-600" />
            Shop-Kontext wechseln
          </CardTitle>
          <CardDescription>
            Wechseln Sie temporär zu einem anderen Shop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingShops ? (
            <div className="text-center py-4 text-gray-500">Lade verfügbare Shops...</div>
          ) : accessibleShops.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">Keine zugänglichen Shops</p>
              <p className="text-sm text-gray-400">
                Wenden Sie sich an einen Superadmin, um Zugriff auf Shops zu erhalten.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Shop auswählen</label>
                <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Shop zum Wechseln auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accessibleShops
                      .filter(shop => shop.shopId !== currentContext?.shopId)
                      .map(shop => (
                        <SelectItem key={shop.id} value={shop.shopId.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{shop.businessName}</span>
                            <Badge 
                              variant={shop.isActive ? 'default' : 'secondary'}
                              className="ml-2"
                            >
                              {shop.isActive ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSwitchShop}
                disabled={switchShopMutation.isPending || !selectedShopId}
                className="w-full"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                {switchShopMutation.isPending ? 'Wechselt...' : 'Shop-Kontext wechseln'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Context-Historie */}
      {contextHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-600" />
              Verlauf der Shop-Wechsel
            </CardTitle>
            <CardDescription>
              Ihre letzten Shop-Kontext Wechsel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contextHistory.slice(0, 5).map((entry, index) => (
                <div 
                  key={`${entry.shopId}-${entry.switchedAt}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{entry.shopName}</div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(entry.switchedAt), { 
                          addSuffix: true, 
                          locale: de 
                        })}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {entry.duration}min
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}