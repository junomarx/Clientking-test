import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Funktion, um zu prüfen, ob ein Benutzer Professional oder höher ist oder Admin
export function isProfessionalOrHigher(user: any): boolean {
  // Debug-Informationen
  console.log('User-Daten in isProfessionalOrHigher:', user);
  console.log('pricingPlan:', user?.pricingPlan);
  console.log('isAdmin:', user?.isAdmin);
  
  // Prüfe, ob der Benutzer ein Professional oder Enterprise Paket hat oder ein Admin ist
  return user?.pricingPlan === 'professional' || 
         user?.pricingPlan === 'enterprise' || 
         user?.isAdmin === true;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Status-Übersetzungen
export const statusLabels: Record<string, string> = {
  "eingegangen": "Eingegangen",
  "in_reparatur": "In Reparatur",
  "ersatzteil_eingetroffen": "Ersatzteil eingetroffen",
  "ausser_haus": "Außer Haus",
  "fertig": "Fertig",
  "abgeholt": "Abgeholt"
};

// Hilfsfunktion für Datum-/Zeitformatierung
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
  } catch (error) {
    console.error("Fehler beim Formatieren des Datums:", error);
    return dateString;
  }
}

export function getStatusBadge(status: string): React.ReactNode {
  const badgeStyle = "px-2 py-1 rounded-md text-xs font-normal";
  
  switch (status) {
    case "eingegangen":
      return React.createElement("span", { className: `${badgeStyle} bg-yellow-100 text-amber-700` }, "Eingegangen");
    case "in_reparatur":
      return React.createElement("span", { className: `${badgeStyle} bg-blue-100 text-blue-700` }, "In Reparatur");
    case "ersatzteil_eingetroffen":
      return React.createElement("span", { className: `${badgeStyle} bg-indigo-100 text-indigo-700` }, "Ersatzteil eingetroffen");
    case "ausser_haus":
      return React.createElement("span", { className: `${badgeStyle} bg-purple-100 text-purple-700` }, "Außer Haus");
    case "fertig":
      return React.createElement("span", { className: `${badgeStyle} bg-green-100 text-green-700` }, "Fertig");
    case "abgeholt":
      return React.createElement("span", { className: `${badgeStyle} bg-gray-100 text-gray-700` }, "Abgeholt");
    default:
      return React.createElement("span", { className: `${badgeStyle} bg-gray-100 text-gray-700` }, status);
  }
}
