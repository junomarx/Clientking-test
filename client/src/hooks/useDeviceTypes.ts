import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Typen für die Gerätetypen
export interface DeviceType {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceTypeDTO {
  name: string;
}

// Hook für Gerätetyp-Operationen
export function useDeviceTypes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Lade alle Gerätetypen
  const getAllDeviceTypes = () => {
    return useQuery<DeviceType[]>({
      queryKey: ['/api/device-types'],
      staleTime: 30000, // 30 Sekunden Caching
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', '/api/device-types');
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für device-types:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error('Fehler beim Laden der Gerätetypen:', error);
          return [];
        }
      },
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Erstelle einen neuen Gerätetyp
  const createDeviceType = () => {
    return useMutation({
      mutationFn: async (data: CreateDeviceTypeDTO) => {
        const res = await apiRequest('POST', '/api/device-types', data);
        return await res.json();
      },
      onSuccess: () => {
        // Invalidiere die Abfrage für Gerätetypen
        queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
        
        toast({
          title: 'Gerätetyp erstellt',
          description: 'Der Gerätetyp wurde erfolgreich erstellt',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Erstellen des Gerätetyps: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Lösche einen Gerätetyp
  const deleteDeviceType = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest('DELETE', `/api/device-types/${id}`);
      },
      onSuccess: () => {
        // Invalidiere die Abfrage für Gerätetypen
        queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
        
        toast({
          title: 'Gerätetyp gelöscht',
          description: 'Der Gerätetyp wurde erfolgreich gelöscht',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Löschen des Gerätetyps: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  return {
    getAllDeviceTypes,
    createDeviceType,
    deleteDeviceType,
  };
}