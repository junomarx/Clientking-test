import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, CheckCircle } from "lucide-react";
import { useMultiShop, type UserShopAccess } from "@/hooks/use-multi-shop";

interface ShopSelectorProps {
  isOpen: boolean;
  onShopSelect: (shopId: number) => void;
  onClose: () => void;
}

/**
 * Shop-Auswahl Dialog für Multi-Shop Admins
 * Zeigt alle verfügbaren Shops an und ermöglicht die Auswahl
 */
export function ShopSelector({ isOpen, onShopSelect, onClose }: ShopSelectorProps) {
  const { accessibleShops, isLoadingShops } = useMultiShop();
  const [selectedShop, setSelectedShop] = useState<number | null>(null);

  const handleShopSelect = (shopAccess: UserShopAccess) => {
    setSelectedShop(shopAccess.shopId);
    // Kurze Verzögerung für visuelles Feedback
    setTimeout(() => {
      onShopSelect(shopAccess.shopId);
      onClose();
    }, 300);
  };

  if (isLoadingShops) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shops werden geladen...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shop auswählen
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sie haben Zugriff auf mehrere Shops. Bitte wählen Sie den Shop aus, mit dem Sie arbeiten möchten.
          </p>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {accessibleShops.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">Keine Shops verfügbar</h3>
                  <p className="text-sm text-muted-foreground">
                    Ihnen wurden noch keine Shop-Zugänge gewährt.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {accessibleShops.map((shopAccess) => (
                <Card
                  key={shopAccess.shopId}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedShop === shopAccess.shopId
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleShopSelect(shopAccess)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{shopAccess.shop.name}</CardTitle>
                          {shopAccess.shop.address && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {shopAccess.shop.address}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {selectedShop === shopAccess.shopId && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                        <Badge variant={shopAccess.shop.isActive ? "default" : "secondary"}>
                          {shopAccess.shop.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground">
                      Zugriff gewährt: {new Date(shopAccess.grantedAt).toLocaleDateString("de-DE")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}