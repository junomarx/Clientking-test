import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
