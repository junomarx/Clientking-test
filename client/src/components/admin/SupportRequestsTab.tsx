import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Check, X, ExternalLink, Calendar, User, Info } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "../../lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SupportRequest {
  id: number;
  superadminId: number;
  superadminUsername?: string;
  reason: string;
  accessType: string;
  startedAt: string;
  status: string;
  isActive: boolean;
}

export default function SupportRequestsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // Abrufen der ausstehenden Support-Anfragen
  const { data: pendingRequests = [], isLoading, error } = useQuery({
    queryKey: ["/api/support/requests/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/support/requests/pending");
      return await res.json() as SupportRequest[];
    },
    refetchInterval: 30000, // Alle 30 Sekunden automatisch aktualisieren
  });

  // Mutation zum Genehmigen einer Support-Anfrage
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/support/requests/${requestId}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/requests/pending"] });
      toast({
        title: "Support-Anfrage genehmigt",
        description: "Der Superadmin kann jetzt auf Ihre Shopdaten zugreifen.",
      });
      setIsApproveDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Die Anfrage konnte nicht genehmigt werden: ${error.message}`,
        variant: "destructive",
      });
      setIsApproveDialogOpen(false);
    },
  });

  // Mutation zum Ablehnen einer Support-Anfrage
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/support/requests/${requestId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/requests/pending"] });
      toast({
        title: "Support-Anfrage abgelehnt",
        description: "Die Support-Anfrage wurde abgelehnt.",
      });
      setIsRejectDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Die Anfrage konnte nicht abgelehnt werden: ${error.message}`,
        variant: "destructive",
      });
      setIsRejectDialogOpen(false);
    },
  });

  // Handler für Genehmigen-Button
  const handleApprove = (requestId: number) => {
    setSelectedRequestId(requestId);
    setIsApproveDialogOpen(true);
  };

  // Handler für Ablehnen-Button
  const handleReject = (requestId: number) => {
    setSelectedRequestId(requestId);
    setIsRejectDialogOpen(true);
  };

  // Bestätigung der Genehmigung
  const confirmApprove = () => {
    if (selectedRequestId) {
      approveMutation.mutate(selectedRequestId);
    }
  };

  // Bestätigung der Ablehnung
  const confirmReject = () => {
    if (selectedRequestId) {
      rejectMutation.mutate(selectedRequestId);
    }
  };

  // Hilfsfunktion zur Formatierung des Zeitabstands
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: de });
    } catch (e) {
      return dateString;
    }
  };

  // Hilfsfunktion zur Konvertierung des Zugriffstyps in menschenlesbaren Text
  const getAccessTypeLabel = (type: string) => {
    switch (type) {
      case "FULL":
        return "Vollzugriff";
      case "READ_ONLY":
        return "Nur Lesezugriff";
      case "LIMITED":
        return "Eingeschränkter Zugriff";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-semibold">Fehler beim Laden der Support-Anfragen</p>
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Support-Anfragen</h2>
      </div>
      
      <Separator />
      
      {pendingRequests.length === 0 ? (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Keine ausstehenden Support-Anfragen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Hier werden Anfragen von Superadmins angezeigt, die Zugriff auf Ihre Shopdaten benötigen.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="bg-muted/10">
                <div className="flex items-center justify-between">
                  <Badge variant={request.accessType === "FULL" ? "destructive" : request.accessType === "READ_ONLY" ? "outline" : "secondary"}>
                    {getAccessTypeLabel(request.accessType)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(request.startedAt)}
                  </span>
                </div>
                <CardTitle className="text-lg">{request.reason}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {request.superadminUsername}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Der Support benötigt Zugriff auf Ihre Shopdaten. Bitte genehmigen Sie die Anfrage, nur wenn Sie Hilfe vom Support angefordert haben.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Angefragt am {new Date(request.startedAt).toLocaleString('de-DE')}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between bg-muted/5 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(request.id)}
                  disabled={rejectMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Ablehnen
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Genehmigen
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Bestätigungsdialog für das Genehmigen */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Support-Anfrage genehmigen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Support-Anfrage wirklich genehmigen? Der Superadmin erhält dadurch
              Zugriff auf die Daten Ihres Shops. Dieser Zugriff wird vollständig protokolliert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Genehmigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bestätigungsdialog für das Ablehnen */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Support-Anfrage ablehnen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Support-Anfrage wirklich ablehnen? Der Superadmin erhält keinen
              Zugriff auf die Daten Ihres Shops und muss eine neue Anfrage stellen, falls Support
              benötigt wird.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ablehnen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}