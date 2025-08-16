import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types für 2FA System
export interface TwoFAStatus {
  isEnabled: boolean;
  methods: {
    email: boolean;
    totp: boolean;
  };
  backupCodes?: string[];
}

export interface TwoFASetupRequest {
  method: "email" | "totp";
}

export interface TwoFAVerifyRequest {
  method: "email" | "totp";
  code: string;
}

export interface TwoFASetupResponse {
  secret?: string; // Nur für TOTP
  qrCode?: string; // Nur für TOTP
  backupCodes?: string[];
  message: string;
}

/**
 * Hook für 2FA (Two-Factor Authentication) Verwaltung
 * Unterstützt sowohl E-Mail als auch TOTP (Google Authenticator) basierte 2FA
 */
export function useTwoFA() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Abrufen des aktuellen 2FA Status
  const { data: twoFAStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<TwoFAStatus>({
    queryKey: ["/api/2fa/status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/2fa/status");
      return response.json();
    },
    staleTime: 30 * 1000, // 30 Sekunden
  });

  // 2FA einrichten
  const setupMutation = useMutation({
    mutationFn: async (data: TwoFASetupRequest): Promise<TwoFASetupResponse> => {
      const response = await apiRequest("POST", "/api/2fa/setup", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      toast({
        title: "2FA eingerichtet",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Einrichten der 2FA",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // E-Mail 2FA Code senden
  const sendEmailCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/2fa/send-email-code");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Code gesendet",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Senden des Codes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 2FA Code verifizieren
  const verifyMutation = useMutation({
    mutationFn: async (data: TwoFAVerifyRequest) => {
      const response = await apiRequest("POST", "/api/2fa/verify", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      toast({
        title: "Code verifiziert",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler bei der Verifizierung",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 2FA deaktivieren
  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/2fa/disable");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
      toast({
        title: "2FA deaktiviert",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Deaktivieren der 2FA",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Daten
    twoFAStatus: twoFAStatus || { isEnabled: false, methods: { email: false, totp: false } },
    
    // Loading States
    isLoadingStatus,
    
    // Mutations
    setup: setupMutation.mutate,
    sendEmailCode: sendEmailCodeMutation.mutate,
    verify: verifyMutation.mutate,
    disable: disableMutation.mutate,
    
    // Pending States
    isSettingUp: setupMutation.isPending,
    isSendingEmailCode: sendEmailCodeMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isDisabling: disableMutation.isPending,
    
    // Results
    setupResult: setupMutation.data,
    
    // Helper Functions
    refetchStatus,
    isEmailEnabled: twoFAStatus?.methods.email || false,
    isTotpEnabled: twoFAStatus?.methods.totp || false,
    isAnyMethodEnabled: twoFAStatus?.isEnabled || false,
  };
}