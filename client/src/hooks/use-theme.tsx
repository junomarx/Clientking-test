import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessSettings } from "@shared/schema";
import { useAuth } from "./use-auth";

// Standardisiertes Theme für alle Benutzer
const STANDARD_THEME = "blue";

type ColorTheme = "blue" | "green" | "purple" | "red" | "orange";

interface ThemeContextType {
  colorTheme: ColorTheme;
  companyName?: string;
}

const initialTheme: ThemeContextType = {
  colorTheme: STANDARD_THEME,
};

const ThemeContext = createContext<ThemeContextType>(initialTheme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeContextType>(initialTheme);
  const { user } = useAuth();
  const userId = user?.id;

  const { data: settings } = useQuery<BusinessSettings | null>({
    queryKey: ["/api/business-settings", userId],
    enabled: !!userId, // Deaktiviere die Abfrage, wenn kein Benutzer angemeldet ist
  });

  useEffect(() => {
    if (settings) {
      // Wir verwenden jetzt immer das Standard-Theme, unabhängig von den Benutzereinstellungen
      const standardTheme: ColorTheme = STANDARD_THEME;

      // Setze die Farbvariablen auf das Standard-Theme
      const root = document.documentElement;
      setRootColors(root, standardTheme);

      // Aktualisiere den Kontext
      setTheme({
        colorTheme: standardTheme,
        companyName: settings.businessName || "Handyshop Verwaltung"
      });
    }
  }, [settings]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Funktion zum Setzen der CSS-Variablen für die verschiedenen Farbpaletten
const setRootColors = (root: HTMLElement, theme: ColorTheme) => {
  switch (theme) {
    case "green":
      root.style.setProperty("--primary", "142 76% 36%"); // grün
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--secondary", "160 84% 39%");
      root.style.setProperty("--chart-1", "142 76% 36%");
      root.style.setProperty("--chart-4", "160 84% 39%");
      break;
    case "purple":
      root.style.setProperty("--primary", "256 56% 46%"); // lila
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--secondary", "262 83% 58%");
      root.style.setProperty("--chart-1", "256 56% 46%");
      root.style.setProperty("--chart-4", "262 83% 58%");
      break;
    case "red":
      root.style.setProperty("--primary", "0 72% 51%"); // rot
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--secondary", "354 70% 53%");
      root.style.setProperty("--chart-1", "0 72% 51%");
      root.style.setProperty("--chart-4", "354 70% 53%");
      break;
    case "orange":
      root.style.setProperty("--primary", "24 75% 50%"); // orange
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--secondary", "27 87% 55%");
      root.style.setProperty("--chart-1", "24 75% 50%");
      root.style.setProperty("--chart-4", "27 87% 55%");
      break;
    case "blue":
    default:
      root.style.setProperty("--primary", "210 90% 60%"); // blau (Standard)
      root.style.setProperty("--primary-foreground", "211 100% 99%");
      root.style.setProperty("--secondary", "240 64% 50%");
      root.style.setProperty("--chart-1", "210 90% 60%");
      root.style.setProperty("--chart-4", "240 64% 50%");
      break;
  }
};