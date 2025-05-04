import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Typen für die Modelle
export interface Model {
  id: number;
  name: string;
  modelSeriesId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelDTO {
  name: string;
  modelSeriesId: number;
}

// Hook für Modell-Operationen
export function useModels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Lade alle Modelle
  const getAllModels = () => {
    return useQuery<Model[]>({
      queryKey: ['/api/models'],
      staleTime: 30000, // 30 Sekunden Caching
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', '/api/models');
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für models:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error('Fehler beim Laden der Modelle:', error);
          return [];
        }
      },
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Lade Modelle für eine bestimmte Modellreihe
  const getModelsByModelSeriesId = (modelSeriesId: number | null) => {
    return useQuery<Model[]>({
      queryKey: ['/api/models', { modelSeriesId }],
      enabled: !!modelSeriesId,
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', `/api/models?modelSeriesId=${modelSeriesId}`);
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für models mit modelSeriesId:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error(`Fehler beim Laden der Modelle für Modellreihe ${modelSeriesId}:`, error);
          return [];
        }
      },
      staleTime: 30000, // 30 Sekunden Caching
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Erstelle ein neues Modell (oder mehrere auf einmal)
  const createModels = () => {
    return useMutation({
      mutationFn: async (models: { modelSeriesId: number, names: string[] }) => {
        // Erstelle jedes Modell einzeln
        const createdModels = [];
        for (const name of models.names) {
          if (name.trim()) { // Ignoriere leere Namen
            const res = await apiRequest('POST', '/api/models', {
              name: name.trim(),
              modelSeriesId: models.modelSeriesId
            });
            createdModels.push(await res.json());
          }
        }
        return createdModels;
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modelle betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/models'] });
        
        toast({
          title: 'Modelle gespeichert',
          description: 'Die Modelle wurden erfolgreich gespeichert',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Speichern der Modelle: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Lösche ein Modell
  const deleteModel = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest('DELETE', `/api/models/${id}`);
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modelle betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/models'] });
        
        toast({
          title: 'Modell gelöscht',
          description: 'Das Modell wurde erfolgreich gelöscht',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Löschen des Modells: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Lösche alle Modelle für eine bestimmte Modellreihe
  const deleteAllModelsForModelSeries = () => {
    return useMutation({
      mutationFn: async (modelSeriesId: number) => {
        await apiRequest('DELETE', `/api/model-series/${modelSeriesId}/models`);
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modelle betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/models'] });
        
        toast({
          title: 'Modelle gelöscht',
          description: 'Alle Modelle für diese Modellreihe wurden erfolgreich gelöscht',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Löschen der Modelle: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Hilfsfunktion: Aktualisiere alle Modelle für eine Modellreihe (löscht zuerst alte Modelle)
  const updateAllModelsForModelSeries = () => {
    return useMutation({
      mutationFn: async ({ modelSeriesId, models }: { modelSeriesId: number, models: string[] }) => {
        // 1. Lösche alle existierenden Modelle für diese Modellreihe
        await apiRequest('DELETE', `/api/model-series/${modelSeriesId}/models`);
        
        // 2. Füge die neuen Modelle hinzu
        const createdModels = [];
        for (const name of models) {
          if (name.trim()) { // Ignoriere leere Namen
            const res = await apiRequest('POST', '/api/models', {
              name: name.trim(),
              modelSeriesId
            });
            createdModels.push(await res.json());
          }
        }
        return createdModels;
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Modelle betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/models'] });
        
        toast({
          title: 'Modelle aktualisiert',
          description: 'Die Modelle wurden erfolgreich aktualisiert',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Aktualisieren der Modelle: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  return {
    getAllModels,
    getModelsByModelSeriesId,
    createModels,
    deleteModel,
    deleteAllModelsForModelSeries,
    updateAllModelsForModelSeries,
  };
}