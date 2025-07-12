import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  User,
  Calendar,
  Euro,
  Settings,
  CheckSquare,
  MoreVertical,
  Edit,
  Phone,
  Mail,
  MapPin,
  StickyNote,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface OrderDetailsDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "spare-part" | "accessory";
}

export function OrderDetailsDialog({ order, open, onOpenChange, type }: OrderDetailsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const endpoint = type === "spare-part" 
        ? "/api/orders/spare-parts-bulk-update"
        : "/api/orders/accessories-bulk-update";
      
      const body = type === "spare-part" 
        ? { partIds: [order.id], status }
        : { accessoryIds: [order.id], status };

      const response = await apiRequest("PATCH", endpoint, body, {
        "X-User-ID": String(user?.id || 0),
      });
      
      if (!response.ok) {
        throw new Error(`Fehler beim Aktualisieren des ${type === "spare-part" ? "Ersatzteils" : "Zubehörs"}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      const queryKey = type === "spare-part" 
        ? ["/api/orders/spare-parts"]
        : ["/api/orders/accessories"];
        
      queryClient.invalidateQueries({ queryKey });
      
      if (type === "spare-part") {
        queryClient.invalidateQueries({ queryKey: ["/api/spare-parts/with-repairs"] });
      }
      
      toast({
        title: "Status aktualisiert",
        description: `${type === "spare-part" ? "Ersatzteil" : "Zubehör"}-Status wurde erfolgreich aktualisiert.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'destructive';
      case 'bestellt':
        return 'secondary';
      case 'eingetroffen':
        return 'default';
      case 'erledigt':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'Bestellen';
      case 'bestellt':
        return 'Bestellt';
      case 'eingetroffen':
        return 'Eingetroffen';
      case 'erledigt':
        return 'Erledigt';
      default:
        return status;
    }
  };

  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate({ status });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {type === "spare-part" ? "Ersatzteil Details" : "Zubehör Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Artikel-Informationen */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Artikel-Informationen
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Aktionen
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("bestellt")}
                    disabled={order.status === "bestellt" || updateStatusMutation.isPending}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Als bestellt markieren
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("eingetroffen")}
                    disabled={order.status === "eingetroffen" || updateStatusMutation.isPending}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Als eingetroffen markieren
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange("erledigt")}
                    disabled={order.status === "erledigt" || updateStatusMutation.isPending}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Als erledigt markieren
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  {type === "spare-part" ? "Ersatzteil" : "Artikel"}
                </label>
                <p className="text-lg font-semibold">
                  {type === "spare-part" ? order.partName : order.articleName}
                </p>
              </div>

              {type === "spare-part" && order.supplier && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Lieferant</label>
                  <p className="text-lg">{order.supplier}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Menge</label>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {order.quantity}x
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Status</label>
                <Badge 
                  variant={getStatusBadgeVariant(order.status)} 
                  className="text-sm px-3 py-1"
                >
                  {getStatusLabel(order.status)}
                </Badge>
              </div>

              {type === "accessory" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Einzelpreis</label>
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4 text-gray-500" />
                      <span className="text-lg">{order.unitPrice}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Gesamtpreis</label>
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4 text-gray-500" />
                      <span className="text-lg font-semibold">{order.totalPrice}</span>
                    </div>
                  </div>

                  {order.downPayment && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Anzahlung</label>
                      <div className="flex items-center gap-1">
                        <Euro className="h-4 w-4 text-gray-500" />
                        <span className="text-lg text-green-600 font-medium">{order.downPayment}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Typ</label>
                    <Badge variant={order.type === "lager" ? "secondary" : "default"}>
                      {order.type === "lager" ? "Lager-Artikel" : "Kundenbestellung"}
                    </Badge>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Erstellt am</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notizen
                </label>
                <p className="text-sm bg-gray-50 p-3 rounded-md">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Kunden-Informationen */}
          {order.customerId && order.customerName && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Kunden-Informationen
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-lg">{order.customerName}</p>
                  </div>

                  {order.customerPhone && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Telefon</label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {order.customerPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {order.customerEmail && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">E-Mail</label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <a 
                          href={`mailto:${order.customerEmail}`}
                          className="text-blue-600 hover:underline"
                        >
                          {order.customerEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  {order.customerAddress && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Adresse</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{order.customerAddress}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Reparatur-Informationen für Ersatzteile */}
          {type === "spare-part" && order.repairId && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Reparatur-Informationen
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Auftragsnummer</label>
                    <p className="text-lg font-mono">{order.orderCode || `#${order.repairId}`}</p>
                  </div>

                  {order.deviceInfo && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Gerät</label>
                      <p className="text-lg">{order.deviceInfo}</p>
                    </div>
                  )}

                  {order.repairStatus && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Reparatur-Status</label>
                      <Badge variant="outline">{order.repairStatus}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}