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
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', '/api/model-series');
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für model-series:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error('Fehler beim Laden der Modellreihen:', error);
          return [];
        }
      },
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Lade Modellreihen für eine bestimmte Hersteller
  const getModelSeriesByBrandId = (brandId: number | null) => {
    return useQuery<ModelSeries[]>({
      queryKey: ['/api/model-series', { brandId }],
      enabled: !!brandId,
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', `/api/model-series?brandId=${brandId}`);
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für model-series mit brandId:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error(`Fehler beim Laden der Modellreihen für Hersteller ${brandId}:`, error);
          return [];
        }
      },
      staleTime: 30000, // 30 Sekunden Caching
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Lade Modellreihen für eine bestimmte Gerätetyp-Herstellern-Kombination
  const getModelSeriesByDeviceTypeAndBrand = (deviceTypeId: number | null, brandId: number | null) => {
    return useQuery<ModelSeries[]>({
      queryKey: ['/api/device-types', deviceTypeId, 'brands', brandId, 'model-series'],
      enabled: !!deviceTypeId && !!brandId,
      queryFn: async () => {
        try {
          const res = await apiRequest(
            'GET', 
            `/api/device-types/${deviceTypeId}/brands/${brandId}/model-series`
          );
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für model-series nach Gerätetyp und Hersteller:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error(`Fehler beim Laden der Modellreihen für Gerätetyp ${deviceTypeId} und Hersteller ${brandId}:`, error);
          return [];
        }
      },
      staleTime: 30000, // 30 Sekunden Caching
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Erstelle eine neue Modellreihe
  const createModelSeries = () => {
    return useMutation({
      mutationFn: async (data: CreateModelSeriesDTO) => {
        console.log('Sende Modellreihe-Daten:', data);
        
        // Validiere Daten vor dem Senden
        if (!data.name || !data.name.trim()) {
          throw new Error('Bitte geben Sie einen Namen für die Modellreihe ein');
        }
        
        if (!data.brandId || isNaN(Number(data.brandId))) {
          throw new Error('Bitte wählen Sie eine gültige Hersteller aus');
        }
        
        // userId wird vom Server automatisch ergänzt
        const modelSeriesData = {
          name: data.name.trim(),
          brandId: Number(data.brandId)
        };
        
        const res = await apiRequest('POST', '/api/model-series', modelSeriesData);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Fehler beim Erstellen der Modellreihe');
        }
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
        console.error('Fehler beim Erstellen der Modellreihe:', error);
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

  // Lösche alle Modellreihen für eine bestimmte Hersteller
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
          description: 'Alle Modellreihen für diese Hersteller wurden erfolgreich gelöscht',
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