import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Shield, Clock, Clock3, User2, Store, Database, AlertCircle } from "lucide-react";

// Typen
interface User {
  id: number;
  username: string;
  email: string;
  shopId: number | null;
  businessName?: string;
}

interface Shop {
  id: number;
  businessName: string;
  ownerName: string;
  contactEmail: string;
}

interface SupportAccessHistory {
  id: number;
  shopId: number;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  accessType: string;
  affectedEntities: string | null;
  shopName?: string;
}

// Support-Zugriff Komponente
export default function SuperadminSupportModeTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [accessType, setAccessType] = useState("all");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // Shops laden
  const { data: shops = [], isLoading: isLoadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/superadmin/shops"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/shops');
      return response.json();
    }
  });

  // Support-Zugriff Historie laden
  const { data: accessHistory = [], isLoading: isLoadingHistory } = useQuery<SupportAccessHistory[]>({
    queryKey: ["/api/support/history"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/support/history');
      const data = await response.json();
      
      // Ergänze Shopnamen zu den Einträgen
      return data.map((entry: SupportAccessHistory) => {
        const shop = shops.find(s => s.id === entry.shopId);
        return {
          ...entry,
          shopName: shop?.businessName || `Shop ID: ${entry.shopId}`
        };
      });
    },
    enabled: !isLoadingShops && shops.length > 0
  });

  // Prüfen, ob ein aktiver Support-Zugriff besteht
  const { data: activeAccess, isLoading: isCheckingAccess, refetch: refetchActiveAccess } = useQuery<{hasAccess: boolean}>({
    queryKey: ["/api/support/access", selectedShopId],
    queryFn: async () => {
      if (!selectedShopId) return { hasAccess: false };
      const response = await apiRequest('GET', `/api/support/access/${selectedShopId}`);
      return response.json();
    },
    enabled: selectedShopId !== null
  });

  // Support-Zugriff beantragen
  const requestAccess = useMutation({
    mutationFn: async () => {
      if (!selectedShopId || !reason || !accessType) {
        throw new Error("Bitte füllen Sie alle Felder aus");
      }
      
      const response = await apiRequest('POST', '/api/support/access', {
        shopId: selectedShopId,
        reason,
        accessType
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Support-Zugriff gestartet",
        description: "Sie haben nun temporären Zugriff auf die ausgewählten Daten.",
      });
      setIsRequestDialogOpen(false);
      queryClient.invalidateQueries({queryKey: ["/api/support/history"]});
      if (selectedShopId) {
        queryClient.invalidateQueries({queryKey: ["/api/support/access", selectedShopId]});
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler beim Starten des Support-Zugriffs",
        description: error.message,
      });
    }
  });

  // Support-Zugriff beenden
  const endAccess = useMutation({
    mutationFn: async (shopId: number) => {
      const response = await apiRequest('DELETE', `/api/support/access/${shopId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Support-Zugriff beendet",
        description: "Der temporäre Zugriff wurde erfolgreich beendet.",
      });
      queryClient.invalidateQueries({queryKey: ["/api/support/history"]});
      if (selectedShopId) {
        queryClient.invalidateQueries({queryKey: ["/api/support/access", selectedShopId]});
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler beim Beenden des Support-Zugriffs",
        description: error.message,
      });
    }
  });

  // Formatieren des Zeitstempels
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE');
  };

  // Aktive Zugriffe filtern
  const activeSessionsCount = accessHistory.filter(h => h.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DSGVO-konformer Support-Modus</h1>
          <p className="text-muted-foreground">
            Temporären Zugriff auf Kundendaten anfordern und protokollieren.
          </p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-2"
              disabled={isLoadingShops}
            >
              <ShieldAlert className="w-4 h-4" />
              Support-Zugriff anfordern
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Support-Zugriff anfordern</DialogTitle>
              <DialogDescription>
                Der Zugriff wird zeitlich begrenzt und vollständig protokolliert.
                Dies ist notwendig für die DSGVO-Konformität.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="shop">Shop auswählen</Label>
                <Select
                  value={selectedShopId?.toString() || ""}
                  onValueChange={(value) => setSelectedShopId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Shop auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id.toString()}>
                        {shop.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="accessType">Zugriffstyp</Label>
                <Select
                  value={accessType}
                  onValueChange={setAccessType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zugriffstyp wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vollzugriff</SelectItem>
                    <SelectItem value="repair_data">Nur Reparaturdaten</SelectItem>
                    <SelectItem value="customer_data">Nur Kundendaten</SelectItem>
                    <SelectItem value="business_settings">Nur Geschäftseinstellungen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reason">Begründung</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Warum benötigen Sie Zugriff auf die Daten dieses Shops?"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsRequestDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={() => requestAccess.mutate()} 
                disabled={!selectedShopId || !reason || !accessType || requestAccess.isPending}
                className="gap-2"
              >
                {requestAccess.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Support-Zugriff starten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Zugriffsstatistik */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktive Support-Sitzungen
            </CardTitle>
            <Shield className={`h-4 w-4 ${activeSessionsCount > 0 ? 'text-orange-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessionsCount}</div>
            <p className="text-xs text-muted-foreground">
              {activeSessionsCount > 0 
                ? "Es gibt aktive Support-Zugriffe" 
                : "Keine aktiven Support-Zugriffe"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Support-Zugriffe insgesamt
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessHistory.length}</div>
            <p className="text-xs text-muted-foreground">
              Gesamtanzahl protokollierter Support-Zugriffe
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unterstützte Shops
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(accessHistory.map(h => h.shopId)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Anzahl der Shops mit Support-Zugriffen
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              DSGVO-Status
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Konform</div>
            <p className="text-xs text-muted-foreground">
              Alle Support-Zugriffe sind DSGVO-konform protokolliert
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zugriffshistorie-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Support-Zugriffshistorie</CardTitle>
          <CardDescription>
            Protokoll aller Support-Zugriffe auf Kundendaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accessHistory.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Noch keine Support-Zugriffe protokolliert</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Zugriffsart</TableHead>
                  <TableHead>Begründung</TableHead>
                  <TableHead>Beginn</TableHead>
                  <TableHead>Ende</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessHistory.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-medium">{access.shopName}</TableCell>
                    <TableCell>
                      <Badge variant={access.accessType === 'all' ? 'destructive' : 'default'}>
                        {access.accessType === 'all' && 'Vollzugriff'}
                        {access.accessType === 'repair_data' && 'Reparaturdaten'}
                        {access.accessType === 'customer_data' && 'Kundendaten'}
                        {access.accessType === 'business_settings' && 'Geschäftseinstellungen'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={access.reason}>
                      {access.reason}
                    </TableCell>
                    <TableCell>{formatDate(access.startedAt)}</TableCell>
                    <TableCell>
                      {access.endedAt ? formatDate(access.endedAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={access.isActive ? 'outline' : 'secondary'}>
                        {access.isActive ? 'Aktiv' : 'Beendet'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {access.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => endAccess.mutate(access.shopId)}
                          disabled={endAccess.isPending}
                        >
                          {endAccess.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Beenden
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}