import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
    queryKey: ['/api/global/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/global/device-types');
      return await res.json();
    },
    staleTime: 60000, // 1 Minute Cache
  });
}

/**
 * Hook zum Abrufen aller globalen Marken für einen bestimmten Gerätetyp
 */
export function useGlobalBrandsByDeviceType(deviceTypeId: number | null) {
  return useQuery<GlobalBrand[]>({
    queryKey: ['/api/global/brands', { deviceTypeId }],
    queryFn: async () => {
      if (!deviceTypeId) return [];
      const res = await apiRequest('GET', `/api/global/brands?deviceTypeId=${deviceTypeId}`);
      return await res.json();
    },
    enabled: !!deviceTypeId,
    staleTime: 60000, // 1 Minute Cache
  });
}

/**
 * Hook zum Abrufen aller globalen Modelle für eine bestimmte Marke
 */
export function useGlobalModelsByBrand(deviceTypeId: number | null, brandId: number | null) {
  return useQuery<GlobalModel[]>({
    queryKey: ['/api/global/models', { deviceTypeId, brandId }],
    queryFn: async () => {
      if (!brandId) return [];
      const res = await apiRequest('GET', `/api/global/models?brandId=${brandId}`);
      return await res.json();
    },
    enabled: !!brandId,
    staleTime: 60000, // 1 Minute Cache
  });
}