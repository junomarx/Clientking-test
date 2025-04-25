import React, { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessSettings } from "@shared/schema";

interface BusinessSettingsContextType {
  settings: BusinessSettings | null;
  isLoading: boolean;
  error: Error | null;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | null>(null);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const { 
    data: settings, 
    isLoading, 
    error 
  } = useQuery<BusinessSettings | null, Error>({
    queryKey: ["/api/business-settings"],
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