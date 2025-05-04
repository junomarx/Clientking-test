import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PricingPlan = 'basic' | 'professional' | 'enterprise';

interface FeatureMatrixEntry {
  key: string;
  label: string;
  plans: Record<PricingPlan, boolean>;
}

export default function AdminPackagesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [featureMatrix, setFeatureMatrix] = useState<FeatureMatrixEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/admin/feature-matrix"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/feature-matrix");
      if (!response.ok) {
        throw new Error(`Failed to fetch feature matrix: ${response.statusText}`);
      }
      return await response.json() as FeatureMatrixEntry[];
    },
  });

  useEffect(() => {
    if (data && !isEditing) {
      setFeatureMatrix(data);
    }
  }, [data, isEditing]);

  const updateFeatureMatrixMutation = useMutation({
    mutationFn: async (features: FeatureMatrixEntry[]) => {
      const response = await apiRequest("POST", "/api/admin/feature-matrix", { features });
      if (!response.ok) {
        throw new Error(`Failed to update feature matrix: ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-matrix"] });
      toast({
        title: "Feature-Matrix aktualisiert",
        description: "Die Feature-Matrix wurde erfolgreich aktualisiert.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren der Feature-Matrix",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFeatureToggle = (featureKey: string, plan: PricingPlan) => {
    setIsEditing(true);
    setFeatureMatrix(prevMatrix => {
      return prevMatrix.map(feature => {
        if (feature.key === featureKey) {
          return {
            ...feature,
            plans: {
              ...feature.plans,
              [plan]: !feature.plans[plan]
            }
          };
        }
        return feature;
      });
    });
  };

  const handleSaveChanges = () => {
    updateFeatureMatrixMutation.mutate(featureMatrix);
  };

  // Admin-Prüfung
  if (!isAuthLoading && (!user || !user.isAdmin)) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Zugriff verweigert</AlertTitle>
        <AlertDescription>
          Sie haben keine Berechtigung, diese Seite anzuzeigen. Nur Administratoren haben Zugriff auf die Paketverwaltung.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fehler</AlertTitle>
        <AlertDescription>
          Beim Laden der Feature-Matrix ist ein Fehler aufgetreten: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pakete und Features</CardTitle>
        <CardDescription>
          Verwalten Sie hier, welche Features in den verschiedenen Tarifen verfügbar sind.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {featureMatrix.length === 0 ? (
          <Alert className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Keine Features definiert</AlertTitle>
            <AlertDescription>
              Es sind noch keine Features definiert. Die Feature-Matrix wird beim ersten API-Aufruf initialisiert.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Professional</TableHead>
                  <TableHead>Enterprise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureMatrix.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell className="font-medium">{feature.label}</TableCell>
                    <TableCell>
                      <Checkbox 
                        checked={feature.plans.basic} 
                        onCheckedChange={() => handleFeatureToggle(feature.key, 'basic')}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox 
                        checked={feature.plans.professional} 
                        onCheckedChange={() => handleFeatureToggle(feature.key, 'professional')}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox 
                        checked={feature.plans.enterprise} 
                        onCheckedChange={() => handleFeatureToggle(feature.key, 'enterprise')}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSaveChanges}
          disabled={updateFeatureMatrixMutation.isPending || !isEditing}
        >
          {updateFeatureMatrixMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Änderungen speichern
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
