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
        const res = await apiRequest('GET', `/api/brands?deviceTypeId=${deviceTypeId}`);
        return await res.json();
      },
      staleTime: 30000, // 30 Sekunden Caching
      throwOnError: true,
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
          description: `Fehler beim Erstellen der Marke: ${error.message}`,
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
          description: `Fehler beim Löschen der Marke: ${error.message}`,
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