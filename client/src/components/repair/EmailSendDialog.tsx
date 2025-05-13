import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { EmailTemplate } from "@shared/schema";

interface EmailSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairId: number | null;
  onSuccess?: () => void;
}

export function EmailSendDialog({
  open,
  onOpenChange,
  repairId,
  onSuccess
}: EmailSendDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Lade alle Kunden-E-Mail-Vorlagen (Typ 'customer')
  const { data: templatesData, isLoading: isLoadingTemplates, error: templatesError } = useQuery({
    queryKey: ['/api/email-templates', 'customer'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/email-templates?type=customer`);
      return await response.json() as EmailTemplate[];
    },
    enabled: open, // Nur laden, wenn der Dialog geöffnet ist
  });

  // E-Mail-Senden-Mutation
  const { mutate: sendEmail, isPending: isSending } = useMutation({
    mutationFn: async () => {
      if (!repairId) {
        throw new Error("Keine Reparatur ausgewählt");
      }
      
      // Die Reparatur abrufen, um die Kundendaten zu erhalten
      const repairResponse = await apiRequest('GET', `/api/repairs/${repairId}`);
      const repair = await repairResponse.json();
      
      if (!repair.customerId) {
        throw new Error("Diese Reparatur hat keinen zugeordneten Kunden");
      }
      
      // Den Kunden abrufen, um die E-Mail-Adresse zu erhalten
      const customerResponse = await apiRequest('GET', `/api/customers/${repair.customerId}`);
      const customer = await customerResponse.json();
      
      if (!customer.email) {
        throw new Error("Der Kunde hat keine E-Mail-Adresse");
      }
      
      // Variablen für die E-Mail-Vorlage sammeln
      const variables = {
        kundenname: `${customer.firstName} ${customer.lastName}`,
        geraet: repair.model || "",
        hersteller: repair.brand || "",
        auftragsnummer: repair.orderCode || `#${repair.id}`,
        fehler: repair.issue || "",
        kostenvoranschlag: repair.estimatedCost?.toString() || "Nicht angegeben",
        repairId: repair.id.toString()
      };
      
      // E-Mail senden mit der allgemeinen API
      const response = await apiRequest('POST', `/api/send-email`, {
        templateId: parseInt(selectedTemplateId),
        to: customer.email,
        variables: variables
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "E-Mail gesendet",
        description: "Die E-Mail wurde erfolgreich versendet.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("Fehler beim Senden der E-Mail:", error);
      toast({
        title: "Fehler",
        description: "Die E-Mail konnte nicht gesendet werden.",
        variant: "destructive"
      });
    }
  });

  // Automatisch das erste Template auswählen, wenn die Vorlagen geladen werden
  useEffect(() => {
    if (templatesData && templatesData.length > 0 && !selectedTemplateId) {
      // Versuche zuerst eine Bewertungsvorlage zu finden
      const reviewTemplate = templatesData.find(t => 
        t.name.toLowerCase().includes("bewertung") || 
        t.name.toLowerCase().includes("feedback")
      );
      
      // Wenn eine Bewertungsvorlage gefunden wurde oder die erste Vorlage auswählen
      setSelectedTemplateId(
        reviewTemplate ? reviewTemplate.id.toString() : templatesData[0].id.toString()
      );
    }
  }, [templatesData, selectedTemplateId]);

  const handleSendEmail = () => {
    if (!selectedTemplateId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine E-Mail-Vorlage aus.",
        variant: "destructive"
      });
      return;
    }
    sendEmail();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>E-Mail an Kunden senden</DialogTitle>
        </DialogHeader>
        
        {isLoadingTemplates ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templatesError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p>Fehler beim Laden der E-Mail-Vorlagen.</p>
          </div>
        ) : templatesData && templatesData.length > 0 ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">E-Mail-Vorlage auswählen</Label>
              <Select 
                value={selectedTemplateId} 
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger id="template" className="w-full">
                  <SelectValue placeholder="Vorlage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {templatesData.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Die E-Mail wird an die E-Mail-Adresse des Kunden gesendet.</p>
              <p>Alle Platzhalter werden automatisch mit den Reparatur- und Kundendaten ersetzt.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-warning" />
            <p>Keine E-Mail-Vorlagen gefunden. Bitte erstellen Sie zuerst eine Vorlage in den Einstellungen.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={isLoadingTemplates || !templatesData || templatesData.length === 0 || !selectedTemplateId || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Senden...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}