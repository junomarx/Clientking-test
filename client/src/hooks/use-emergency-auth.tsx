import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { User as SelectUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type EmergencyAuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: string | null;
  emergencyLogin: (username: string, password: string) => Promise<boolean>;
  emergencyLogout: () => Promise<void>;
};

type LoginResponse = {
  success: boolean;
  message: string;
  user: SelectUser;
  token: string;
};

// Endpunkte für den Notfallserver auf dem Hauptserver
const EMERGENCY_API = {
  LOGIN: '/api/direct-login',
  USER: '/api/direct-user',
  LOGOUT: '/api/direct-logout'
};

// Erstelle Context
const EmergencyAuthContext = createContext<EmergencyAuthContextType | null>(null);

// EmergencyAuthProvider-Komponente
export function EmergencyAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Beim Laden prüfen, ob ein Token existiert und Benutzer abrufen
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('emergency_auth_token');
      
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(EMERGENCY_API.USER, {
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
        localStorage.removeItem('emergency_auth_token');
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
  const emergencyLogin = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(EMERGENCY_API.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data: LoginResponse = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Anmeldung fehlgeschlagen');
      }
      
      // Token und Benutzer speichern
      localStorage.setItem('emergency_auth_token', data.token);
      localStorage.setItem('userId', data.user.id.toString());
      localStorage.setItem('username', data.user.username);
      setUser(data.user);
      
      toast({
        title: "Notfall-Anmeldung erfolgreich",
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
  const emergencyLogout = async (): Promise<void> => {
    try {
      await fetch(EMERGENCY_API.LOGOUT, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Fehler beim Logout (wird ignoriert):', error);
    } finally {
      // Unabhängig vom Ergebnis aufräumen
      localStorage.removeItem('emergency_auth_token');
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
    <EmergencyAuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        emergencyLogin,
        emergencyLogout
      }}
    >
      {children}
    </EmergencyAuthContext.Provider>
  );
}

// Hook zum Verwenden des Kontexts
export function useEmergencyAuth() {
  const context = useContext(EmergencyAuthContext);
  if (!context) {
    throw new Error("useEmergencyAuth must be used within a EmergencyAuthProvider");
  }
  return context;
}