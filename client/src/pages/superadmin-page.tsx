import React, { useEffect, useState } from 'react';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Home } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// NOTFALLSEITE FÜR DEN SUPERADMIN
// Diese Seite wurde vereinfacht, um Rendering-Probleme zu umgehen

export default function SuperadminPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  // Ausloggen-Funktion
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      setLocation("/auth");
      toast({
        title: "Erfolgreich ausgeloggt",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
    } catch (error) {
      console.error("Fehler beim Ausloggen:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Ausloggen",
        description: "Bitte versuchen Sie es erneut.",
      });
    }
  };

  // Seite-Titel aktualisieren
  useEffect(() => {
    document.title = "Superadmin-Bereich (Notfallmodus) | Handyshop Verwaltung";
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border">
        <h1 className="text-2xl font-bold text-center mb-2">Superadmin-Bereich</h1>
        <h2 className="text-xl font-semibold text-center text-destructive mb-6">⚠️ Notfallmodus ⚠️</h2>
        
        <p className="mb-4 text-muted-foreground">
          Der Superadmin-Bereich wurde aufgrund von Rendering-Problemen vorübergehend in einen Notfallmodus versetzt.
          Bitte kehren Sie zur Hauptansicht zurück und verwenden Sie die Funktionen der App.
        </p>
        
        <p className="mb-6 text-muted-foreground">
          Ein Administrator wird sich in Kürze um das Problem kümmern.
        </p>
        
        <div className="flex flex-col space-y-3">
          <Button asChild variant="default" className="w-full">
            <Link to="/app">
              <Home className="mr-2 h-4 w-4" />
              Zurück zur Hauptansicht
            </Link>
          </Button>
          
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Ausloggen
          </Button>
        </div>
      </div>
    </div>
  );
}
