import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface DeploymentFixDialogProps {
  children: React.ReactNode;
}

interface FixResult {
  step: string;
  success: boolean;
  message: string;
  details?: string;
}

interface FixResponse {
  success: boolean;
  results: FixResult[];
  summary: {
    usersFixed: number;
    businessSettingsCreated: number;
    modelsDistributed: number;
  };
}

export function DeploymentFixDialog({ children }: DeploymentFixDialogProps) {
  const [open, setOpen] = useState(false);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const { toast } = useToast();
  
  const deploymentFixMutation = useMutation({
    mutationFn: async (): Promise<FixResponse> => {
      const response = await apiRequest("POST", "/api/superadmin/deployment-fix");
      
      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setFixResults(data.results);
      toast({
        title: "Deployment-Reparatur abgeschlossen",
        description: `${data.summary.usersFixed} Benutzer, ${data.summary.businessSettingsCreated} Business Settings, ${data.summary.modelsDistributed} Modelle repariert.`,
      });
      
      // Cache invalidieren für alle relevanten Daten
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
    },
    onError: (error: any) => {
      toast({
        title: "Reparatur fehlgeschlagen",
        description: error.message || "Die Deployment-Reparatur konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    },
  });

  const handleFix = () => {
    setFixResults([]);
    deploymentFixMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Deployment-Reparatur
          </DialogTitle>
          <DialogDescription>
            Führt automatisch alle notwendigen Korrekturen für das Deployment durch: 
            Benutzerdaten reparieren, Gerätemodelle verteilen und Business Settings vervollständigen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Was wird repariert:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Inaktive Benutzer aktivieren</li>
              <li>• Fehlende Shop-IDs zuweisen</li>
              <li>• Business Settings erstellen/vervollständigen</li>
              <li>• Gerätemodelle für alle Benutzer verfügbar machen</li>
            </ul>
          </div>

          {/* Reparatur-Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleFix}
              disabled={deploymentFixMutation.isPending}
              size="lg"
              className="flex items-center gap-2"
            >
              {deploymentFixMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {deploymentFixMutation.isPending ? 'Repariere...' : 'Deployment jetzt reparieren'}
            </Button>
          </div>

          {/* Ergebnisse */}
          {fixResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Reparatur-Ergebnisse:</h4>
              {fixResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border flex items-start gap-3 ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.step}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Erfolgreich" : "Fehlgeschlagen"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hinweis */}
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
            💡 Diese Reparatur kann sicher mehrfach ausgeführt werden. 
            Bereits korrekte Daten werden nicht verändert.
          </div>

          {/* Schließen Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}