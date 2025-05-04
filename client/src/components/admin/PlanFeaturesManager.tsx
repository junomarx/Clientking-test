import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Check, Save, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Feature, PricingPlan } from "@shared/planFeatures";

// Definition der verfügbaren Features mit Beschreibungen und Kategorien
const featureDefinitions = [
  { id: "dashboard", name: "Dashboard", description: "Startseite mit Übersicht", category: "basic" },
  { id: "repairs", name: "Reparaturen", description: "Verwaltung von Reparaturaufträgen", category: "basic" },
  { id: "customers", name: "Kunden", description: "Kundenverwaltung", category: "basic" },
  { id: "printA4", name: "A4-Druck", description: "Drucken von A4-Dokumenten", category: "basic" },
  { id: "deviceTypes", name: "Gerätetypen", description: "Verwaltung von Gerätetypen", category: "basic" },
  { id: "brands", name: "Marken", description: "Verwaltung von Marken und Modellen", category: "basic" },
  
  { id: "costEstimates", name: "Kostenvoranschläge", description: "Erstellen von Kostenvoranschlägen", category: "professional" },
  { id: "emailTemplates", name: "E-Mail-Vorlagen", description: "Verwaltung von E-Mail-Vorlagen", category: "professional" },
  { id: "print58mm", name: "58mm-Druck", description: "Druck auf 58mm-Bon-Drucker", category: "professional" },
  { id: "printThermal", name: "Thermo-Druck", description: "Druck auf Thermopapier", category: "professional" },
  { id: "downloadRepairReport", name: "Reparaturberichte", description: "Export von Reparaturberichten", category: "professional" },
  
  { id: "statistics", name: "Statistiken", description: "Erweiterte Statistiken und Analysen", category: "enterprise" },
  { id: "backup", name: "Backup & Export", description: "Datenexport und -sicherung", category: "enterprise" },
  { id: "advancedSearch", name: "Erweiterte Suche", description: "Erweiterte Suchfunktionen", category: "enterprise" },
  { id: "apiAccess", name: "API-Zugriff", description: "Zugriff auf API-Endpunkte", category: "enterprise" },
  { id: "multiUser", name: "Mehrbenutzer", description: "Mehrbenutzer-Unterstützung", category: "enterprise" },
  { id: "advancedReporting", name: "Erweiterte Berichte", description: "Erweiterte Berichterstellung", category: "enterprise" },
  { id: "customEmailTemplates", name: "Eigene E-Mail-Vorlagen", description: "Benutzerdefinierte E-Mail-Vorlagen", category: "enterprise" },
  { id: "feedbackSystem", name: "Feedback-System", description: "Kundenfeedback-System", category: "enterprise" },
];

// Aus dem zentralen planFeatures importieren
import { planFeatures as initialPlanFeatures } from "@shared/planFeatures";

export function PlanFeaturesManager() {
  const { toast } = useToast();
  const [planFeatures, setPlanFeatures] = useState<Record<PricingPlan, Feature[]>>(initialPlanFeatures);
  const [selectedTab, setSelectedTab] = useState<PricingPlan>("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Feature-Änderung verarbeiten
  const handleFeatureChange = (feature: Feature, checked: boolean) => {
    setPlanFeatures(prev => {
      const newPlanFeatures = { ...prev };
      
      if (checked) {
        // Feature hinzufügen, wenn es nicht bereits vorhanden ist
        if (!newPlanFeatures[selectedTab].includes(feature)) {
          newPlanFeatures[selectedTab] = [...newPlanFeatures[selectedTab], feature];
        }
      } else {
        // Feature entfernen
        newPlanFeatures[selectedTab] = newPlanFeatures[selectedTab].filter(f => f !== feature);
      }
      
      return newPlanFeatures;
    });
    
    setHasChanges(true);
  };
  
  // Prüfen, ob ein Feature in dem aktuell ausgewählten Plan enthalten ist
  const isFeatureEnabled = (feature: Feature) => {
    return planFeatures[selectedTab].includes(feature);
  };
  
  // Änderungen speichern
  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      // Hier könnte man die Änderungen an den Server senden
      // z.B. await apiRequest("POST", "/api/admin/plan-features", planFeatures);
      
      // Da wir aktuell keine Server-API dafür haben, zeigen wir nur eine Toast-Nachricht
      toast({
        title: "Hinweis",
        description: "Die Feature-Matrix wurde aktualisiert. Die Änderungen werden in der nächsten Version persistent gespeichert.",
        variant: "default"
      });
      
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Fehler beim Speichern",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Tarif-Feature-Verwaltung</h2>
          <p className="text-muted-foreground">Definieren Sie, welche Features in welchem Tarif verfügbar sind</p>
        </div>
        
        <Button 
          onClick={saveChanges} 
          disabled={isSaving || !hasChanges}
          className="gap-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Änderungen speichern
        </Button>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Tarif-basierte Feature-Zuweisung</AlertTitle>
        <AlertDescription>
          Die hier definierten Feature-Matrizen bestimmen, welche Funktionen in welchem Tarif verfügbar sind.
          Individuelle Ausnahmen können weiterhin über Feature-Übersteuerungen direkt am Benutzer festgelegt werden.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Features pro Tarifpaket</CardTitle>
          <CardDescription>
            Definieren Sie den Funktionsumfang für jeden Tarif
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as PricingPlan)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="gap-2">
                Basic
                <Badge variant="outline">{planFeatures.basic.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="professional" className="gap-2">
                Professional
                <Badge variant="outline">{planFeatures.professional.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="enterprise" className="gap-2">
                Enterprise
                <Badge variant="outline">{planFeatures.enterprise.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Feature-Tabelle für jeden Tarif */}
            {["basic", "professional", "enterprise"].map((plan) => (
              <TabsContent key={plan} value={plan} className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Kategorie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureDefinitions.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <Checkbox 
                            checked={isFeatureEnabled(feature.id as Feature)}
                            onCheckedChange={(checked) => handleFeatureChange(feature.id as Feature, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell>{feature.description}</TableCell>
                        <TableCell>
                          <Badge variant={
                            feature.category === "basic" ? "outline" : 
                            feature.category === "professional" ? "success" : 
                            "default"
                          }>
                            {feature.category === "basic" ? "Basic" : 
                             feature.category === "professional" ? "Professional" : 
                             "Enterprise"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {plan === "basic" && (
                  <Alert className="mt-4" variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hinweis zum Basic-Tarif</AlertTitle>
                    <AlertDescription>
                      Der Basic-Tarif sollte alle grundlegenden Funktionen enthalten, die für den Betrieb der Anwendung notwendig sind.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}