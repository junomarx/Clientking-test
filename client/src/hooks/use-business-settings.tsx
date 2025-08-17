import React, { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessSettings } from "@shared/schema";
import { useAuth } from "./use-auth";

interface BusinessSettingsContextType {
  settings: BusinessSettings | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | null>(null);

/**
 * KOMPLETT NEU GESCHRIEBEN:
 * - Die Benutzer-ID wird nicht mehr im Query-Key verwendet
 * - Die Authentifizierung und Datenisolierung erfolgt komplett auf dem Server
 * - Die Komponente stellt die Daten und Refetch-Funktion zur Verfügung
 */
export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Multi-Shop Admins haben keine Business Settings - sie verwalten nur andere Shops
  const isMultiShopAdmin = user?.isMultiShopAdmin && !user?.shopId;
  
  const { 
    data: settings, 
    isLoading, 
    error,
    refetch 
  } = useQuery<BusinessSettings | null, Error>({
    queryKey: ["/api/business-settings"], // KEIN userId mehr im Query-Key
    // Abfrage nur aktivieren, wenn der Benutzer angemeldet ist UND nicht Multi-Shop Admin
    enabled: !!user && !isMultiShopAdmin,
  });

  return (
    <BusinessSettingsContext.Provider
      value={{
        settings: isMultiShopAdmin ? null : (settings ?? null), // Multi-Shop Admins haben keine Settings
        isLoading: isMultiShopAdmin ? false : isLoading,
        error: isMultiShopAdmin ? null : error,
        refetch, // Refetch-Funktion bereitstellen
      }}
    >
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);
  if (!context) {
    throw new Error("useBusinessSettings must be used within a BusinessSettingsProvider");
  }
  return context;
}