import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export interface CreateModelSeriesDTO {
  name: string;
  brandId: number;
}

/**
 * Hook für die Verwaltung von Modellreihen mit den notwendigen Hilfsmutationen
 */
export function useModelSeries() {
  /**
   * Erstellt eine neue Modellreihe
   */
  const createModelSeries = () => {
    return useMutation({
      mutationFn: async (data: CreateModelSeriesDTO) => {
        const res = await apiRequest('POST', '/api/model-series', data);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
      }
    });
  };

  /**
   * Methode zum Erstellen von Gerätetypen (früher in useDeviceTypes)
   */
  const getCreateDeviceTypeMutation = () => {
    return useMutation({
      mutationFn: async (data: { name: string }) => {
        const res = await apiRequest('POST', '/api/device-types', data);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      }
    });
  };

  /**
   * Methode zum Erstellen von Marken (früher in useBrands)
   */
  const getCreateBrandMutation = () => {
    return useMutation({
      mutationFn: async (data: { name: string; deviceTypeId: number }) => {
        const res = await apiRequest('POST', '/api/brands', data);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      }
    });
  };

  /**
   * Methode zum Erstellen von Modellen (früher in useModels)
   */
  const getCreateModelsMutation = () => {
    return useMutation({
      mutationFn: async (data: { name: string; brandId: number; modelSeriesId?: number }) => {
        const res = await apiRequest('POST', '/api/models', data);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      }
    });
  };

  return {
    createModelSeries,
    getCreateDeviceTypeMutation,
    getCreateBrandMutation,
    getCreateModelsMutation
  };
}