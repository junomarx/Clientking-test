import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Hook für Navigation innerhalb des AuthProviders
function useNavigateInAuth() {
  const [, setLocation] = useLocation();
  return setLocation;
}

// Typendefinition für User ohne Passwort
type UserResponse = Omit<User, "password">;

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  companyName: string;
  companyAddress?: string;
  companyVatNumber?: string;
  companyPhone?: string;
  companyEmail?: string;
};

type AuthContextType = {
  user: UserResponse | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserResponse, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const setLocation = useNavigateInAuth();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserResponse | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Hier speichern wir den Token aus der Antwort
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        console.log('Token saved to localStorage');
      }
      
      // WICHTIG: Benutzer-ID im localStorage speichern, damit sie für API-Anfragen verfügbar ist
      if (data.id) {
        localStorage.setItem('userId', data.id.toString());
        console.log('UserId saved to localStorage:', data.id);
      }
      
      // Benutzername im localStorage speichern für Debugging
      if (data.username) {
        localStorage.setItem('username', data.username);
        console.log('Username saved to localStorage:', data.username);
      }
      
      // Benutzer-Daten setzen
      queryClient.setQueryData(["/api/user"], data);
      
      // WICHTIG: Alle Caches vollständig zurücksetzen, um Datenisolierung sicherzustellen
      // Dies verhindert, dass Daten anderer Benutzer angezeigt werden
      queryClient.invalidateQueries();
      
      // Nach erfolgreichem Login zur Hauptseite weiterleiten
      setLocation('/');
      
      toast({
        title: "Anmeldung erfolgreich",
        description: `Willkommen zurück, ${data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Bei erfolgreicher Registrierung im B2B-System immer auf Admin-Freischaltung warten
      // Der Benutzer wird nicht automatisch angemeldet
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Registrierung erfolgreich",
        description: "Vielen Dank für Ihre Registrierung. Ihr Konto muss vom Administrator freigeschaltet werden, bevor Sie sich anmelden können.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Token und Benutzerinformationen bei Abmeldung entfernen
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      
      // Benutzer-Daten sofort auf null setzen
      queryClient.setQueryData(["/api/user"], null);
      
      // WICHTIG: Alle Caches vollständig zurücksetzen, um Datenisolierung sicherzustellen
      // Dies verhindert, dass Daten des vorherigen Benutzers angezeigt werden
      queryClient.clear();
      
      toast({
        title: "Abmeldung erfolgreich",
        description: "Sie wurden erfolgreich abgemeldet."
      });
      
      // Seite komplett neu laden, um sicherzustellen, dass der Logout-Status erkannt wird
      window.location.href = '/auth';
    },
    onError: (error: Error) => {
      toast({
        title: "Abmeldung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}