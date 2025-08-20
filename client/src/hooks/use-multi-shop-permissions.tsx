import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface PendingPermissionRequest {
  id: number;
  userId: number;
  multiShopAdminId: number;
  shopId: number;
  status: 'pending' | 'approved' | 'denied';
  requestReason: string;
  adminUsername: string;
  adminEmail?: string;
  shopName?: string;
  shopBusinessName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopPermissionStatus {
  shopId: number;
  shopName: string;
  businessName: string;
  hasPermission: boolean;
  permissionGrantedAt?: string;
  canRequestPermission: boolean;
  pendingRequestId?: number;
}

/**
 * Hook für Multi-Shop Permission Management
 * Verwaltet DSGVO-konforme Berechtigungsanfragen zwischen Multi-Shop Admins und Shop Owners
 */
export function useMultiShopPermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wartende Berechtigungsanfragen für Shop Owner
  const { data: pendingRequests, isLoading: loadingPendingRequests } = useQuery<PendingPermissionRequest[]>({
    queryKey: ['/api/shop-owner/pending-requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/shop-owner/pending-requests');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Berechtigungsanfragen');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 Minuten
    retry: 1
  });

  // Permission Status für Multi-Shop Admins
  const { data: permissionStatuses, isLoading: loadingPermissions } = useQuery<ShopPermissionStatus[]>({
    queryKey: ['/api/multi-shop/permission-statuses'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/multi-shop/permission-statuses');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Berechtigungsstatus');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    retry: 1
  });

  // Berechtigung genehmigen (Shop Owner)
  const approvePermissionMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: number; comment?: string }) => {
      const response = await apiRequest('POST', `/api/shop-owner/approve-request/${requestId}`, {
        comment
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Genehmigen der Berechtigung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop-owner/pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/permission-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/accessible-shops'] });
      toast({
        title: 'Berechtigung genehmigt',
        description: 'Der Multi-Shop Admin Zugriff wurde erfolgreich genehmigt.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Genehmigen',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Berechtigung ablehnen (Shop Owner)
  const denyPermissionMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      const response = await apiRequest('POST', `/api/shop-owner/deny-request/${requestId}`, {
        reason
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Ablehnen der Berechtigung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop-owner/pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/permission-statuses'] });
      toast({
        title: 'Berechtigung abgelehnt',
        description: 'Die Berechtigungsanfrage wurde abgelehnt.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Ablehnen',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Berechtigung anfordern (Multi-Shop Admin)
  const requestPermissionMutation = useMutation({
    mutationFn: async ({ shopId, reason }: { shopId: number; reason: string }) => {
      const response = await apiRequest('POST', '/api/multi-shop/request-permission', {
        shopId,
        reason
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Anfordern der Berechtigung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/permission-statuses'] });
      toast({
        title: 'Berechtigung angefordert',
        description: 'Ihre Berechtigungsanfrage wurde gesendet und wartet auf Genehmigung.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Anfordern',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Berechtigung widerrufen (Shop Owner)
  const revokePermissionMutation = useMutation({
    mutationFn: async ({ multiShopAdminId, reason }: { multiShopAdminId: number; reason?: string }) => {
      const response = await apiRequest('POST', '/api/shop-owner/revoke-permission', {
        multiShopAdminId,
        reason
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Widerrufen der Berechtigung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop-owner/pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/permission-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/accessible-shops'] });
      toast({
        title: 'Berechtigung widerrufen',
        description: 'Die Multi-Shop Admin Berechtigung wurde erfolgreich widerrufen.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler beim Widerrufen',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    // Daten
    pendingRequests,
    permissionStatuses,
    
    // Loading States
    loadingPendingRequests,
    loadingPermissions,
    
    // Mutations
    approvePermission: approvePermissionMutation.mutate,
    denyPermission: denyPermissionMutation.mutate,
    requestPermission: requestPermissionMutation.mutate,
    revokePermission: revokePermissionMutation.mutate,
    
    // Mutation States
    isApprovingPermission: approvePermissionMutation.isPending,
    isDenyingPermission: denyPermissionMutation.isPending,
    isRequestingPermission: requestPermissionMutation.isPending,
    isRevokingPermission: revokePermissionMutation.isPending
  };
}