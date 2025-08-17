import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types für Multi-Shop System - angepasst an die tatsächliche API-Antwort
export interface UserShopAccess {
  id: number;
  name: string;
  businessName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shopId: number;
  grantedAt: string;
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
  const { data: accessibleShops, isLoading: isLoadingShops, error: shopsError } = useQuery<UserShopAccess[]>({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching accessible shops:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    retry: 3,
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

  // Multi-Shop Admin löschen
  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: number) => {
      const response = await apiRequest("DELETE", `/api/multi-shop/admin/${adminId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admins"] });
      toast({
        title: "Admin gelöscht",
        description: "Der Multi-Shop Admin wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
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
    
    // Error States
    shopsError,
    
    // Mutations
    grantAccess: grantAccessMutation.mutate,
    revokeAccess: revokeAccessMutation.mutate,
    deleteAdmin: deleteAdminMutation.mutate,
    isGrantingAccess: grantAccessMutation.isPending,
    isRevokingAccess: revokeAccessMutation.isPending,
    isDeletingAdmin: deleteAdminMutation.isPending,
    
    // Helper Functions
    hasMultipleShops: (accessibleShops?.length || 0) > 1,
    isMultiShopAdmin: (accessibleShops?.length || 0) > 0,
  };
}