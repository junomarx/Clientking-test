import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AccessTester } from "@/components/testing/AccessTester";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Verfügbare Features für Tests
const FEATURES = [
  { id: "dashboard", name: "Dashboard", tier: "basic" },
  { id: "repairs", name: "Reparaturen", tier: "basic" },
  { id: "printA4", name: "A4-Druck", tier: "basic" },
  { id: "costEstimates", name: "Kostenvoranschläge", tier: "professional" },
  { id: "emailTemplates", name: "E-Mail Vorlagen", tier: "professional" },
  { id: "print58mm", name: "58mm-Bon Druck", tier: "professional" },
  { id: "statistics", name: "Statistiken", tier: "enterprise" },
  { id: "backup", name: "Backup & Restore", tier: "enterprise" },
  { id: "advancedSearch", name: "Erweiterte Suche", tier: "enterprise" },
  { id: "apiAccess", name: "API-Zugriff", tier: "enterprise" },
];

export function FeatureOverridesTestPanel() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<string>("");
  
  // Alle Benutzer laden
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  // Feature-Tester für den ausgewählten Benutzer laden
  const handleTestUser = () => {
    if (!selectedUserId) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie einen Benutzer aus.",
      });
      return;
    }
    
    // Hier könnte man den Benutzer zur Testansicht umleiten
    toast({
      title: "Feature-Test",
      description: `Feature-Test für Benutzer ID ${selectedUserId} gestartet.`,
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Feature-Override Tests</h2>
          <p className="text-muted-foreground">Testen Sie Zugriffsberechtigungen basierend auf Tarifen und Feature-Übersteuerungen</p>
        </div>
      </div>
      
      <Tabs defaultValue="feature-testing">
        <TabsList>
          <TabsTrigger value="feature-testing">Feature-Tests</TabsTrigger>
          <TabsTrigger value="user-test">Benutzer-Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="feature-testing" className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Überprüfen Sie die Zugriffslogik</AlertTitle>
            <AlertDescription>
              Testen Sie die Client- und Server-Zugriffsprüfung für verschiedene Funktionen
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => (
              <AccessTester 
                key={feature.id}
                feature={feature.id}
                title={feature.name}
                description={`Tarifstufe: ${feature.tier === 'basic' ? 'Basic' : feature.tier === 'professional' ? 'Professional' : 'Enterprise'}`}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="user-test" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Benutzer-spezifische Tests</CardTitle>
              <CardDescription>
                Wählen Sie einen Benutzer aus, um dessen Feature-Zugriffe zu testen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Benutzer auswählen</label>
                  <Select 
                    disabled={isLoadingUsers}
                    value={selectedUserId} 
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Benutzer auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.username} ({user.pricingPlan || 'Kein Tarif'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Feature auswählen</label>
                  <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                    <SelectTrigger>
                      <SelectValue placeholder="Feature auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURES.map((feature) => (
                        <SelectItem key={feature.id} value={feature.id}>
                          {feature.name} ({feature.tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleTestUser}
                disabled={!selectedUserId || isLoadingUsers}
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" /> Benutzer testen
              </Button>
              
              {selectedUserId && selectedFeature && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Test-Konfiguration</AlertTitle>
                  <AlertDescription>
                    Benutzer: {users.find((u: any) => String(u.id) === selectedUserId)?.username || 'Unbekannt'}<br />
                    Feature: {FEATURES.find(f => f.id === selectedFeature)?.name || 'Unbekannt'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}