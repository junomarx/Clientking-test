import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types für Multi-Shop System
export interface Shop {
  id: number;
  name: string;
  businessName: string;
  address?: string;
  isActive: boolean;
}

export interface UserShopAccess {
  id: number;
  userId: number;
  shopId: number;
  grantedBy: number;
  grantedAt: string;
  shop: Shop;
}

export interface CreateUserShopAccess {
  userId: number;
  shopId: number;
}

export interface MultiShopAdmin {
  id: number;
  username: string;
  email: string | null;
  accessibleShops: UserShopAccess[];
}

/**
 * Hook für Multi-Shop Verwaltung
 * Ermöglicht Superadmins die Verwaltung von Shop-Zugriffen für Benutzer
 */
export function useMultiShop() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Abrufen der zugänglichen Shops für den aktuellen Benutzer
  const { data: accessibleShops, isLoading: isLoadingShops } = useQuery<UserShopAccess[]>({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });

  // Abrufen aller Multi-Shop Admins (nur für Superadmins)
  const { data: multiShopAdmins, isLoading: isLoadingAdmins } = useQuery<MultiShopAdmin[]>({
    queryKey: ["/api/multi-shop/admins"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/admins");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    retry: false, // Nicht retries bei 403 Fehlern
  });

  // Shop-Zugang gewähren
  const grantAccessMutation = useMutation({
    mutationFn: async (data: CreateUserShopAccess) => {
      const response = await apiRequest("POST", "/api/multi-shop/grant-access", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/accessible-shops"] });
      toast({
        title: "Zugang gewährt",
        description: "Shop-Zugang wurde erfolgreich gewährt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Gewähren des Zugangs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Shop-Zugang entziehen
  const revokeAccessMutation = useMutation({
    mutationFn: async (data: CreateUserShopAccess) => {
      const response = await apiRequest("DELETE", "/api/multi-shop/revoke-access", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/accessible-shops"] });
      toast({
        title: "Zugang entzogen",
        description: "Shop-Zugang wurde erfolgreich entzogen",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Entziehen des Zugangs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Daten
    accessibleShops: accessibleShops || [],
    multiShopAdmins: multiShopAdmins || [],
    
    // Loading States
    isLoadingShops,
    isLoadingAdmins,
    
    // Mutations
    grantAccess: grantAccessMutation.mutate,
    revokeAccess: revokeAccessMutation.mutate,
    isGrantingAccess: grantAccessMutation.isPending,
    isRevokingAccess: revokeAccessMutation.isPending,
    
    // Helper Functions
    hasMultipleShops: (accessibleShops?.length || 0) > 1,
    isMultiShopAdmin: (accessibleShops?.length || 0) > 0,
  };
}