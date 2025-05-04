import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

type PricingPlan = "basic" | "professional" | "enterprise";

type Feature = {
  key: string;
  label: string;
  description?: string;
  plans: Record<PricingPlan, boolean>;
};

export function FeatureMatrixTab() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("GET", "/api/admin/features");
      const data = await response.json();
      setFeatures(data);
    } catch (error) {
      toast({
        title: "Fehler beim Laden der Features",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (featureKey: string, plan: PricingPlan) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.key === featureKey
          ? { ...f, plans: { ...f.plans, [plan]: !f.plans[plan] } }
          : f
      )
    );
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);
      const response = await apiRequest("POST", "/api/admin/features/update", { features });
      
      if (!response.ok) {
        throw new Error("Server-Fehler beim Speichern der Änderungen");
      }
      
      toast({
        title: "Änderungen gespeichert",
        description: "Die Feature-Konfiguration wurde erfolgreich aktualisiert.",
      });
    } catch (error) {
      toast({
        title: "Fehler beim Speichern",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Features pro Tarifpaket</h2>
        <p className="text-sm text-muted-foreground">
          Definieren Sie, welche Funktionen in welchem Tarif enthalten sind.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Feature</TableHead>
              <TableHead className="text-center">Basic</TableHead>
              <TableHead className="text-center">Professional</TableHead>
              <TableHead className="text-center">Enterprise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.key}>
                <TableCell className="font-medium">
                  <div>
                    <div>{feature.label}</div>
                    {feature.description && (
                      <div className="text-xs text-muted-foreground mt-1">{feature.description}</div>
                    )}
                  </div>
                </TableCell>
                {(["basic", "professional", "enterprise"] as PricingPlan[]).map(
                  (plan) => (
                    <TableCell className="text-center" key={plan}>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={feature.plans[plan]}
                          onCheckedChange={() => toggleFeature(feature.key, plan)}
                        />
                      </div>
                    </TableCell>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        onClick={saveChanges}
        disabled={isSaving}
        className="mt-4"
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSaving ? "Wird gespeichert..." : "Änderungen speichern"}
      </Button>
    </div>
  );
}
