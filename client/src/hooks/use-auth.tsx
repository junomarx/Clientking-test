import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      
      queryClient.setQueryData(["/api/user"], data);
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
      // Wenn die Registrierung erfolgreich war, aber der Benutzer noch aktiviert werden muss,
      // zeigen wir eine entsprechende Meldung an
      if (data.message && data.message.includes("Freischaltung")) {
        queryClient.setQueryData(["/api/user"], null);
        toast({
          title: "Registrierung erfolgreich",
          description: data.message,
        });
      } else {
        // Ansonsten normal fortfahren (automatische Aktivierung)
        queryClient.setQueryData(["/api/user"], data);
        toast({
          title: "Registrierung erfolgreich",
          description: `Willkommen, ${data.username}!`,
        });
      }
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
      // Token bei Abmeldung entfernen
      localStorage.removeItem('auth_token');
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Abmeldung erfolgreich",
        description: "Sie wurden erfolgreich abgemeldet."
      });
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