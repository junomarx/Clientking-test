import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { queryClient } from '../lib/queryClient';

export interface ModelSeries {
  id: number;
  name: string;
  brandId: number;
}

export interface CreateModelSeriesDTO {
  name: string;
  brandId: number;
}

/**
 * Vereinfachter Hook für die Verwaltung von Modellreihen (vereinfachte Version)
 * 
 * HINWEIS: Diese Version ist stark vereinfacht, da die Geräteverwaltung jetzt
 * über den GlobalDeviceSelector und den Superadmin erfolgt. Die meisten Funktionen
 * wurden entfernt, aber der Hook wird für Kompatibilität beibehalten.
 */
export function useModelSeries() {
  /**
   * Holt alle Modellreihen
   */
  const getAllModelSeries = () => {
    return useQuery<ModelSeries[], Error>({
      queryKey: ['/api/model-series'],
      queryFn: async () => {
        const res = await apiRequest('GET', '/api/model-series');
        return res.json();
      }
    });
  };

  /**
   * Holt Modellreihen für eine bestimmte Marke
   */
  const getModelSeriesByBrandId = (brandId: number | null) => {
    return useQuery<ModelSeries[], Error>({
      queryKey: ['/api/model-series/brand', brandId],
      queryFn: async () => {
        if (!brandId) return [];
        const res = await apiRequest('GET', `/api/model-series/brand/${brandId}`);
        return res.json();
      },
      enabled: !!brandId
    });
  };

  /**
   * Holt Modellreihen für einen bestimmten Gerätetyp und eine bestimmte Marke
   */
  const getModelSeriesByDeviceTypeAndBrand = (deviceTypeId: number | null, brandId: number | null) => {
    return useQuery<ModelSeries[], Error>({
      queryKey: ['/api/model-series/device-type-brand', deviceTypeId, brandId],
      queryFn: async () => {
        if (!deviceTypeId || !brandId) return [];
        const res = await apiRequest('GET', `/api/model-series/device-type/${deviceTypeId}/brand/${brandId}`);
        return res.json();
      },
      enabled: !!deviceTypeId && !!brandId
    });
  };

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

  return {
    getAllModelSeries,
    getModelSeriesByBrandId,
    getModelSeriesByDeviceTypeAndBrand,
    createModelSeries
  };
}