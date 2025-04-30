import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Typen für die Modellreihen
export interface ModelSeries {
  id: number;
  name: string;
  brandId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelSeriesDTO {
  name: string;
  brandId: number;
  userId?: number; // Optional, wird vom Server aus dem Auth-Token gesetzt
}

// Hook für Modellreihen-Operationen
export function useModelSeries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Lade alle Modellreihen
  const getAllModelSeries = () => {
    return useQuery<ModelSeries[]>({
      queryKey: ['/api/model-series'],
      staleTime: 30000, // 30 Sekunden Caching
      throwOnError: true,
    });
  };

  // Lade Modellreihen für eine bestimmte Marke
  const getModelSeriesByBrandId = (brandId: number | null) => {
    return useQuery<ModelSeries[]>({
      queryKey: ['/api/model-series', { brandId }],
      enabled: !!brandId,
      queryFn: async () => {
        const res = await apiRequest('GET', `/api/model-series?brandId=${brandId}`);
        return await res.json();
      },
      staleTime: 30000, // 30 Sekunden Caching
      throwOnError: true,
    });
  };

  // Lade Modellreihen für eine bestimmte Gerätetyp-Marken-Kombination
  const getModelSeriesByDeviceTypeAndBrand = (deviceTypeId: number | null, brandId: number | null) => {
    return useQuery<ModelSeries[]>({
      queryKey: ['/api/device-types', deviceTypeId, 'brands', brandId, 'model-series'],
      enabled: !!deviceTypeId && !!brandId,
      queryFn: async () => {
        const res = await apiRequest(
          'GET', 
          `/api/device-types/${deviceTypeId}/brands/${brandId}/model-series`
        );
        return await res.json();
      },
      staleTime: 30000, // 30 Sekunden Caching
      throwOnError: true,
    });
  };

  // Erstelle eine neue Modellreihe
  const createModelSeries = () => {
    return useMutation({
      mutationFn: async (data: CreateModelSeriesDTO) => {
        const res = await apiRequest('POST', '/api/model-series', data);
        return await res.json();
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modellreihen betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
        queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
        
        toast({
          title: 'Modellreihe erstellt',
          description: 'Die Modellreihe wurde erfolgreich erstellt',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Erstellen der Modellreihe: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Lösche eine Modellreihe
  const deleteModelSeries = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest('DELETE', `/api/model-series/${id}`);
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modellreihen betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
        queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
        
        toast({
          title: 'Modellreihe gelöscht',
          description: 'Die Modellreihe wurde erfolgreich gelöscht',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Löschen der Modellreihe: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Lösche alle Modellreihen für eine bestimmte Marke
  const deleteAllModelSeriesForBrand = () => {
    return useMutation({
      mutationFn: async (brandId: number) => {
        await apiRequest('DELETE', `/api/brands/${brandId}/model-series`);
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modellreihen betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
        queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
        
        toast({
          title: 'Modellreihen gelöscht',
          description: 'Alle Modellreihen für diese Marke wurden erfolgreich gelöscht',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Löschen der Modellreihen: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  return {
    getAllModelSeries,
    getModelSeriesByBrandId,
    getModelSeriesByDeviceTypeAndBrand,
    createModelSeries,
    deleteModelSeries,
    deleteAllModelSeriesForBrand,
  };
}