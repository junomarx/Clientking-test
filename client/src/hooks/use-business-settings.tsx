import React, { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessSettings } from "@shared/schema";
import { useAuth } from "./use-auth";

interface BusinessSettingsContextType {
  settings: BusinessSettings | null;
  isLoading: boolean;
  error: Error | null;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | null>(null);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  // Wir nutzen die User-ID aus dem Auth-Hook, um den Query-Key zu aktualisieren
  const { user } = useAuth();
  const userId = user?.id;
  
  const { 
    data: settings, 
    isLoading, 
    error 
  } = useQuery<BusinessSettings | null, Error>({
    queryKey: ["/api/business-settings", userId], // Benutzer-ID in den Query-Key einbinden
    // Deaktivieren der Abfrage, wenn kein Benutzer angemeldet ist
    enabled: !!userId,
  });

  return (
    <BusinessSettingsContext.Provider
      value={{
        settings: settings ?? null,
        isLoading,
        error,
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