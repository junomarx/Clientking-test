import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Feature, FeatureOverrides } from "@/lib/permissions";
import { apiRequest } from "@/lib/queryClient";

/**
 * Komponente zum Testen der Feature-Übersteuerungen
 */
export function FeatureOverridesTestPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State für Feature-Übersteuerungen
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({});
  const [userFeatures, setUserFeatures] = useState<{feature: string, hasAccess: boolean}[]>([]);
  const [isProfessional, setIsProfessional] = useState<boolean>(false);
  const [isEnterprise, setIsEnterprise] = useState<boolean>(false);
  const [selectedFeature, setSelectedFeature] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Feature-Liste
  const features = [
    "dashboard",
    "repairs", 
    "customers", 
    "printA4",
    "deviceTypes",
    "brands",
    "costEstimates", 
    "emailTemplates", 
    "printThermal",
    "downloadRepairReport",
    "statistics", 
    "backup",
    "multiUser",
    "advancedReporting",
    "customEmailTemplates",
    "feedbackSystem"
  ];
  
  // Lade aktuelle Feature-Übersteuerungen
  useEffect(() => {
    if (!user) return;
    
    fetchFeatureOverrides();
    fetchProfessionalStatus();
    fetchEnterpriseStatus();
  }, [user]);
  
  // Lade Feature-Übersteuerungen
  const fetchFeatureOverrides = async () => {
    try {
      const response = await fetch('/api/feature-overrides');
      if (!response.ok) throw new Error('Fehler beim Laden der Feature-Übersteuerungen');
      
      const data = await response.json();
      setFeatureOverrides(data.featureOverrides || {});
    } catch (error) {
      console.error('Fehler beim Laden der Feature-Übersteuerungen:', error);
      toast({
        title: "Fehler",
        description: "Feature-Übersteuerungen konnten nicht geladen werden",
        variant: "destructive"
      });
    }
  };
  
  // Lade Professional-Status
  const fetchProfessionalStatus = async () => {
    try {
      const response = await fetch('/api/check-professional');
      if (!response.ok) throw new Error('Fehler beim Laden des Professional-Status');
      
      const data = await response.json();
      setIsProfessional(data.isProfessionalOrHigher || false);
    } catch (error) {
      console.error('Fehler beim Laden des Professional-Status:', error);
    }
  };
  
  // Lade Enterprise-Status
  const fetchEnterpriseStatus = async () => {
    try {
      const response = await fetch('/api/check-enterprise');
      if (!response.ok) throw new Error('Fehler beim Laden des Enterprise-Status');
      
      const data = await response.json();
      setIsEnterprise(data.isEnterprise || false);
    } catch (error) {
      console.error('Fehler beim Laden des Enterprise-Status:', error);
    }
  };
  
  // Prüfe Zugriff auf ausgewähltes Feature
  const checkAccess = async () => {
    if (!selectedFeature) {
      toast({
        title: "Hinweis",
        description: "Bitte wähle zuerst ein Feature aus",
        variant: "default"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/check-feature-access/${selectedFeature}`);
      if (!response.ok) throw new Error('Fehler beim Prüfen des Feature-Zugriffs');
      
      const data = await response.json();
      setUserFeatures([...userFeatures, {
        feature: selectedFeature, 
        hasAccess: data.hasAccess
      }]);
      
      toast({
        title: data.hasAccess ? "Zugriff erlaubt" : "Zugriff verweigert",
        description: `Feature: ${selectedFeature}, Paket: ${data.pricingPlan}`,
        variant: data.hasAccess ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Fehler beim Prüfen des Feature-Zugriffs:', error);
      toast({
        title: "Fehler",
        description: "Zugriff konnte nicht geprüft werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Speichere Feature-Übersteuerungen
  const saveFeatureOverrides = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/feature-overrides', featureOverrides);
      
      toast({
        title: "Gespeichert",
        description: "Feature-Übersteuerungen wurden gespeichert",
        variant: "default"
      });
      
      // Status aktualisieren
      fetchProfessionalStatus();
      fetchEnterpriseStatus();
      
      // Liste aktualisieren
      setUserFeatures([]);
    } catch (error) {
      console.error('Fehler beim Speichern der Feature-Übersteuerungen:', error);
      toast({
        title: "Fehler",
        description: "Feature-Übersteuerungen konnten nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle für Feature-Übersteuerung
  const toggleFeature = (feature: string) => {
    setFeatureOverrides(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  // Entferne eine Feature-Übersteuerung
  const removeFeatureOverride = (feature: string) => {
    setFeatureOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[feature];
      return newOverrides;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Feature-Übersteuerungs-Testpanel</CardTitle>
        <CardDescription>
          Hier kannst du Feature-Übersteuerungen testen und verwalten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Aktueller Status</h3>
              <div className="flex items-center gap-2">
                <Button onClick={fetchFeatureOverrides} variant="outline" size="sm" disabled={isLoading}>
                  Aktualisieren
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-4">
                <p className="font-medium mb-2">Paket: {user?.pricingPlan}</p>
                <div className="flex items-center gap-4 my-2">
                  <Label>Professional-Zugriff:</Label>
                  <span className={isProfessional ? "text-green-500" : "text-red-500"}>
                    {isProfessional ? "Ja" : "Nein"}
                  </span>
                </div>
                <div className="flex items-center gap-4 my-2">
                  <Label>Enterprise-Zugriff:</Label>
                  <span className={isEnterprise ? "text-green-500" : "text-red-500"}>
                    {isEnterprise ? "Ja" : "Nein"}
                  </span>
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <p className="font-medium mb-2">Feature-Übersteuerungen:</p>
                <div className="space-y-2">
                  {Object.entries(featureOverrides).length > 0 ? (
                    Object.entries(featureOverrides).map(([feature, allowed]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <span>{feature}</span>
                        <div className="flex items-center gap-2">
                          <span className={allowed ? "text-green-500" : "text-red-500"}>
                            {allowed ? "Erlaubt" : "Gesperrt"}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFeatureOverride(feature)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Übersteuerungen definiert</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">Zugriff testen</h3>
            <div className="flex items-center gap-2">
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Feature auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {features.map(feature => (
                    <SelectItem key={feature} value={feature}>{feature}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={checkAccess} disabled={isLoading || !selectedFeature}>
                Zugriff prüfen
              </Button>
            </div>
            
            {userFeatures.length > 0 && (
              <div className="mt-4 border rounded-md p-4">
                <h4 className="font-medium mb-2">Testergebnisse:</h4>
                <div className="space-y-2">
                  {userFeatures.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{item.feature}</span>
                      <span className={item.hasAccess ? "text-green-500" : "text-red-500"}>
                        {item.hasAccess ? "Erlaubt" : "Gesperrt"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">Übersteuerungen verwalten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map(feature => (
                <div key={feature} className="flex items-center justify-between border rounded-md p-3">
                  <Label htmlFor={`feature-${feature}`} className="flex-1">{feature}</Label>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id={`feature-${feature}`}
                      checked={!!featureOverrides[feature]}
                      onCheckedChange={() => toggleFeature(feature)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={saveFeatureOverrides} disabled={isLoading}>
                {isLoading ? "Speichern..." : "Übersteuerungen speichern"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}