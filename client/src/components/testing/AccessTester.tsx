import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { hasAccessClient } from "@/lib/permissions";
import { Feature } from "@/lib/permissions";

interface AccessTesterProps {
  feature: string;
  title?: string;
  description?: string;
}

/**
 * Komponente zum Testen des Zugriffs auf eine bestimmte Funktion
 */
export function AccessTester({ feature, title, description }: AccessTesterProps) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverAccess, setServerAccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Lokale Zugriffsprüfung (Client-Side)
  useEffect(() => {
    if (!user) return;
    
    let parsedOverrides = null;
    if (user.featureOverrides && typeof user.featureOverrides === 'string') {
      try {
        parsedOverrides = JSON.parse(user.featureOverrides);
      } catch (e) {
        console.warn(`Fehler beim Parsen der Feature-Übersteuerungen:`, e);
      }
    }
    
    const access = hasAccessClient(
      user.pricingPlan as "basic" | "professional" | "enterprise", 
      feature as Feature, 
      parsedOverrides
    );
    
    setHasAccess(access);
  }, [user, feature]);
  
  // Server-seitige Zugriffsprüfung via API
  const checkServerAccess = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/check-feature-access/${feature}`);
      if (!response.ok) throw new Error(`HTTP Fehler ${response.status}`);
      
      const data = await response.json();
      setServerAccess(data.hasAccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setServerAccess(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title || `Feature: ${feature}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Client-Zugriff:</span>
            <span className={`font-medium ${hasAccess ? 'text-green-500' : 'text-red-500'}`}>
              {hasAccess ? "Erlaubt" : "Verweigert"}
            </span>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Server-Zugriff:</span>
              {serverAccess === null ? (
                <span className="text-sm italic text-muted-foreground">Nicht geprüft</span>
              ) : (
                <span className={`font-medium ${serverAccess ? 'text-green-500' : 'text-red-500'}`}>
                  {serverAccess ? "Erlaubt" : "Verweigert"}
                </span>
              )}
            </div>
            
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            
            <Button 
              onClick={checkServerAccess} 
              disabled={isLoading} 
              size="sm" 
              variant="outline" 
              className="w-full mt-2"
            >
              {isLoading ? "Prüfe..." : "Server-Zugriff prüfen"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}