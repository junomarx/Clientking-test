import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Typen für die Hersteller
export interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDTO {
  name: string;
  deviceTypeId: number;
  userId?: number;
}

// Hook für Hersteller-Operationen
export function useBrands() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Lade alle Hersteller
  const getAllBrands = () => {
    return useQuery<Brand[]>({
      queryKey: ['/api/brands'],
      staleTime: 30000, // 30 Sekunden Caching
      throwOnError: true,
    });
  };

  // Lade Hersteller für einen bestimmten Gerätetyp
  const getBrandsByDeviceTypeId = (deviceTypeId: number | null) => {
    return useQuery<Brand[]>({
      queryKey: ['/api/brands', { deviceTypeId }],
      enabled: !!deviceTypeId,
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', `/api/brands?deviceTypeId=${deviceTypeId}`);
          
          // Prüfe den Content-Type vor dem JSON-Parsing
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Unerwarteter Content-Type für brands:', contentType);
            return [];
          }
          
          return await res.json();
        } catch (error) {
          console.error('Fehler beim Laden der Hersteller:', error);
          // Leeres Array zurückgeben statt einen Fehler zu werfen
          return [];
        }
      },
      staleTime: 30000, // 30 Sekunden Caching
      // throwOnError entfernt, um besser mit Fehlern umzugehen
    });
  };

  // Erstelle einen neuen Hersteller
  const createBrand = () => {
    return useMutation({
      mutationFn: async (data: CreateBrandDTO) => {
        const res = await apiRequest('POST', '/api/brands', data);
        return await res.json();
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Hersteller betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
        
        toast({
          title: 'Hersteller erstellt',
          description: 'Der Hersteller wurde erfolgreich erstellt',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Erstellen des Herstellers: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  // Lösche einen Hersteller
  const deleteBrand = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest('DELETE', `/api/brands/${id}`);
      },
      onSuccess: () => {
        // Invalidiere alle Abfragen, die Hersteller betreffen
        queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
        
        toast({
          title: 'Hersteller gelöscht',
          description: 'Der Hersteller wurde erfolgreich gelöscht',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Fehler',
          description: `Fehler beim Löschen des Herstellers: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  return {
    getAllBrands,
    getBrandsByDeviceTypeId,
    createBrand,
    deleteBrand,
  };
}