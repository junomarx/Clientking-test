import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Typendefinitionen für die Gerätedaten
export interface GlobalDeviceType {
  id: number;
  name: string;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalBrand {
  id: number;
  name: string;
  deviceTypeId: number;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalModel {
  id: number;
  name: string;
  brandId: number;
  modelSeriesId: number | null;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook zum Abrufen aller globalen Gerätetypen
 */
export function useGlobalDeviceTypes() {
  return useQuery<GlobalDeviceType[]>({
    queryKey: ['/api/public/global/device-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/public/global/device-types');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der globalen Gerätetypen');
      }
      return response.json();
    },
  });
}

/**
 * Hook zum Abrufen aller globalen Marken für einen bestimmten Gerätetyp
 */
export function useGlobalBrandsByDeviceType(deviceTypeId: number | null) {
  return useQuery<GlobalBrand[]>({
    queryKey: ['/api/public/global/device-types', deviceTypeId, 'brands'],
    queryFn: async () => {
      if (!deviceTypeId) return [];
      
      const response = await apiRequest('GET', `/api/public/global/device-types/${deviceTypeId}/brands`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der globalen Marken');
      }
      return response.json();
    },
    enabled: !!deviceTypeId, // Query nur ausführen, wenn deviceTypeId vorhanden ist
  });
}

/**
 * Hook zum Abrufen aller globalen Modelle für eine bestimmte Marke
 */
export function useGlobalModelsByBrand(deviceTypeId: number | null, brandId: number | null) {
  return useQuery<GlobalModel[]>({
    queryKey: ['/api/public/global/device-types', deviceTypeId, 'brands', brandId, 'models'],
    queryFn: async () => {
      if (!deviceTypeId || !brandId) return [];
      
      const response = await apiRequest('GET', `/api/public/global/device-types/${deviceTypeId}/brands/${brandId}/models`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der globalen Modelle');
      }
      return response.json();
    },
    enabled: !!deviceTypeId && !!brandId, // Query nur ausführen, wenn deviceTypeId und brandId vorhanden sind
  });
}