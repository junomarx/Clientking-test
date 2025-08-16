import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMultiShop } from "@/hooks/use-multi-shop";
import { ShopSelector } from "@/components/multi-shop/ShopSelector";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface MultiShopProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
}

/**
 * Erweiterte Protected Route Komponente mit Multi-Shop Unterstützung
 * - Normale Shop-Besitzer werden direkt zur App geleitet
 * - Multi-Shop Admins erhalten einen Shop-Auswahl Dialog
 * - Superadmins haben direkten Zugang ohne Shop-Auswahl
 */
export function MultiShopProtectedRoute({ path, component: Component }: MultiShopProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { accessibleShops, isLoadingShops, hasMultipleShops } = useMultiShop();
  const [showShopSelector, setShowShopSelector] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  // Prüfen ob Shop-Auswahl nötig ist wenn Benutzer geladen ist
  useEffect(() => {
    if (user && !isLoadingShops) {
      // Superadmins (shopId = null) brauchen keine Shop-Auswahl
      if (user.shopId === null) {
        return;
      }

      // Benutzer mit mehreren Shops brauchen Shop-Auswahl
      if (hasMultipleShops && !selectedShopId) {
        setShowShopSelector(true);
        return;
      }

      // Normale Shop-Besitzer mit nur einem Shop
      if (!hasMultipleShops && accessibleShops.length === 1) {
        setSelectedShopId(accessibleShops[0].shopId);
      }
    }
  }, [user, isLoadingShops, hasMultipleShops, accessibleShops, selectedShopId]);

  // Shop-Auswahl Handler
  const handleShopSelect = (shopId: number) => {
    setSelectedShopId(shopId);
    setShowShopSelector(false);
    
    // Shop-Kontext im localStorage speichern für API-Anfragen
    localStorage.setItem('selectedShopId', shopId.toString());
    
    // Alle relevanten Caches invalidieren für Shop-spezifische Daten
    // (wird durch useMultiShop automatisch gemacht)
  };

  // Laden-Zustand während Authentication und Shop-Daten geladen werden
  if (isLoading || (user && isLoadingShops)) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isLoading ? "Anmeldung wird überprüft..." : "Shop-Daten werden geladen..."}
            </p>
          </div>
        </div>
      </Route>
    );
  }

  // Nicht angemeldet - zur Auth-Seite weiterleiten
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Multi-Shop Admin mit Shop-Auswahl Dialog
  if (showShopSelector && hasMultipleShops) {
    return (
      <Route path={path}>
        <div className="min-h-screen bg-muted/10 flex items-center justify-center">
          <ShopSelector
            isOpen={true}
            onShopSelect={handleShopSelect}
            onClose={() => setShowShopSelector(false)}
          />
        </div>
      </Route>
    );
  }

  // Normale Anzeige der geschützten Komponente
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}