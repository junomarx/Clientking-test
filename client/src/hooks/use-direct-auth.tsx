import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { User as SelectUser } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type DirectAuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: string | null;
  directLogin: (username: string, password: string) => Promise<boolean>;
  directLogout: () => Promise<void>;
};

type LoginResponse = {
  success: boolean;
  message: string;
  user: SelectUser;
  token: string;
};

// Erstelle Context
const DirectAuthContext = createContext<DirectAuthContextType | null>(null);

// AuthProvider-Komponente
export function DirectAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Beim Laden prüfen, ob ein Token existiert und Benutzer abrufen
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('direct_auth_token');
      
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/direct-user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Token ungültig oder abgelaufen');
        }
        
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          
          // Für Debug-Zwecke im localStorage speichern
          localStorage.setItem('userId', data.user.id.toString());
          localStorage.setItem('username', data.user.username);
        } else {
          throw new Error(data.message || 'Fehler beim Abrufen des Benutzers');
        }
      } catch (error) {
        console.error('Fehler bei der Authentifizierung:', error);
        
        // Token entfernen, wenn er ungültig ist
        localStorage.removeItem('direct_auth_token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        setUser(null);
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Unbekannter Fehler bei der Authentifizierung');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login-Funktion
  const directLogin = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await apiRequest("POST", "/api/direct-login", { username, password });
      const data: LoginResponse = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Anmeldung fehlgeschlagen');
      }
      
      // Token und Benutzer speichern
      localStorage.setItem('direct_auth_token', data.token);
      localStorage.setItem('userId', data.user.id.toString());
      localStorage.setItem('username', data.user.username);
      setUser(data.user);
      
      toast({
        title: "Anmeldung erfolgreich",
        description: `Willkommen zurück, ${data.user.username}!`,
      });
      
      // Zur App-Seite weiterleiten
      setLocation('/app');
      return true;
    } catch (error) {
      console.error('Fehler bei der Anmeldung:', error);
      
      let errorMessage = "Anmeldung fehlgeschlagen";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout-Funktion
  const directLogout = async (): Promise<void> => {
    try {
      await apiRequest("POST", "/api/direct-logout");
    } catch (error) {
      console.error('Fehler beim Logout (wird ignoriert):', error);
    } finally {
      // Unabhängig vom Ergebnis aufräumen
      localStorage.removeItem('direct_auth_token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      setUser(null);
      
      // Zur Auth-Seite weiterleiten
      setLocation('/auth');
      
      toast({
        title: "Abmeldung erfolgreich",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
    }
  };
  
  // Context-Provider zurückgeben
  return (
    <DirectAuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        directLogin,
        directLogout
      }}
    >
      {children}
    </DirectAuthContext.Provider>
  );
}

// Hook zum Verwenden des Kontexts
export function useDirectAuth() {
  const context = useContext(DirectAuthContext);
  if (!context) {
    throw new Error("useDirectAuth must be used within a DirectAuthProvider");
  }
  return context;
}