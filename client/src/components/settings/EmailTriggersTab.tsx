import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Trash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Status-Optionen für Reparaturen
const statusOptions = [
  { value: "eingegangen", label: "Eingegangen" },
  { value: "in_reparatur", label: "In Reparatur" },
  { value: "ersatzteil_eingetroffen", label: "Ersatzteil eingetroffen" },
  { value: "fertig", label: "Fertig" },
  { value: "abholbereit", label: "Abholbereit" },
  { value: "abgeholt", label: "Abgeholt" },
  { value: "ausser_haus", label: "Außer Haus" },
];

// Schnittstellen definieren
interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface EmailTrigger {
  id: number;
  repairStatus: string;
  emailTemplateId: number;
  active: boolean;
}

interface NewTriggerFormData {
  repairStatus: string;
  emailTemplateId: number;
  active: boolean;
}

export function EmailTriggersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newTrigger, setNewTrigger] = useState<NewTriggerFormData>({
    repairStatus: "",
    emailTemplateId: 0,
    active: true,
  });

  // Abrufen der E-Mail-Vorlagen
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
  } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  // Abrufen der E-Mail-Trigger
  const {
    data: triggers = [],
    isLoading: triggersLoading,
    error: triggersError,
  } = useQuery<EmailTrigger[]>({
    queryKey: ["/api/email-triggers"],
  });

  // Erstellen eines neuen Triggers
  const createMutation = useMutation({
    mutationFn: async (trigger: NewTriggerFormData) => {
      const res = await apiRequest("POST", "/api/email-triggers", trigger);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-triggers"] });
      toast({
        title: "Trigger erstellt",
        description: "Der E-Mail-Trigger wurde erfolgreich erstellt.",
      });
      setIsCreating(false);
      setNewTrigger({
        repairStatus: "",
        emailTemplateId: 0,
        active: true,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Erstellen des Triggers: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Aktualisieren eines Triggers
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<EmailTrigger>;
    }) => {
      const res = await apiRequest("PATCH", `/api/email-triggers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-triggers"] });
      toast({
        title: "Trigger aktualisiert",
        description: "Der E-Mail-Trigger wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Aktualisieren des Triggers: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Löschen eines Triggers
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/email-triggers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-triggers"] });
      toast({
        title: "Trigger gelöscht",
        description: "Der E-Mail-Trigger wurde erfolgreich gelöscht.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen des Triggers: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Status-Änderung eines Triggers
  const handleStatusChange = (triggerId: number, newStatus: boolean) => {
    updateMutation.mutate({
      id: triggerId,
      data: { active: newStatus },
    });
  };

  // Vorlage für einen Trigger ändern
  const handleTemplateChange = (triggerId: number, templateId: number) => {
    updateMutation.mutate({
      id: triggerId,
      data: { emailTemplateId: templateId },
    });
  };

  // Neuen Trigger erstellen
  const handleCreateTrigger = () => {
    if (!newTrigger.repairStatus || !newTrigger.emailTemplateId) {
      toast({
        title: "Eingabe fehlt",
        description: "Bitte wählen Sie einen Status und eine E-Mail-Vorlage aus.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(newTrigger);
  };

  // Überprüfen, ob ein Status bereits einen Trigger hat
  const getUsedStatuses = () => {
    return triggers.map((trigger) => trigger.repairStatus);
  };

  // Verfügbare Status-Optionen (die noch nicht verwendet werden)
  const getAvailableStatusOptions = () => {
    const usedStatuses = getUsedStatuses();
    return statusOptions.filter(
      (option) => !usedStatuses.includes(option.value)
    );
  };

  // Status-Label abrufen
  const getStatusLabel = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status);
    return option ? option.label : status;
  };

  // Vorlagen-Name abrufen
  const getTemplateName = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    return template ? template.name : "Vorlage nicht gefunden";
  };

  // Lade-Indikator anzeigen, wenn Daten geladen werden
  if (templatesLoading || triggersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Fehler anzeigen, falls vorhanden
  if (templatesError || triggersError) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <h3 className="font-bold">Fehler beim Laden der Daten</h3>
        <p>{(templatesError || triggersError)?.message}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Mail-Benachrichtigungen bei Statusänderungen</CardTitle>
        <CardDescription>
          Konfigurieren Sie, welche E-Mail-Vorlage bei welchem Reparaturstatus automatisch versendet werden soll.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bestehende Trigger anzeigen */}
        {triggers.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Konfigurierte Benachrichtigungen</h3>
            <div className="space-y-4">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-md"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{getStatusLabel(trigger.repairStatus)}</span>
                    <span className="text-sm text-muted-foreground">
                      Status: {trigger.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    <Select
                      value={trigger.emailTemplateId.toString()}
                      onValueChange={(value) => handleTemplateChange(trigger.id, parseInt(value))}
                    >
                      <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Vorlage auswählen">
                          {getTemplateName(trigger.emailTemplateId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem
                            key={template.id}
                            value={template.id.toString()}
                          >
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trigger.active}
                        onCheckedChange={(value) => handleStatusChange(trigger.id, value)}
                      />
                      <Label htmlFor={`switch-${trigger.id}`}>
                        {trigger.active ? "Aktiv" : "Inaktiv"}
                      </Label>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteMutation.mutate(trigger.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-muted p-4 rounded-md text-center">
            <p>Keine E-Mail-Trigger konfiguriert.</p>
          </div>
        )}

        {/* Neuen Trigger hinzufügen */}
        {isCreating ? (
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="text-lg font-semibold">Neue Benachrichtigung hinzufügen</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repairStatus">Reparaturstatus</Label>
                <Select
                  value={newTrigger.repairStatus}
                  onValueChange={(value) =>
                    setNewTrigger({ ...newTrigger, repairStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatusOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailTemplateId">E-Mail-Vorlage</Label>
                <Select
                  value={
                    newTrigger.emailTemplateId
                      ? newTrigger.emailTemplateId.toString()
                      : ""
                  }
                  onValueChange={(value) =>
                    setNewTrigger({
                      ...newTrigger,
                      emailTemplateId: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vorlage auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id.toString()}
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="trigger-active"
                checked={newTrigger.active}
                onCheckedChange={(value) =>
                  setNewTrigger({ ...newTrigger, active: value })
                }
              />
              <Label htmlFor="trigger-active">
                {newTrigger.active ? "Aktiv" : "Inaktiv"}
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewTrigger({
                    repairStatus: "",
                    emailTemplateId: 0,
                    active: true,
                  });
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateTrigger}
                disabled={
                  !newTrigger.repairStatus ||
                  !newTrigger.emailTemplateId ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsCreating(true)}
            disabled={getAvailableStatusOptions().length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Neue Benachrichtigung hinzufügen
          </Button>
        )}

        {getAvailableStatusOptions().length === 0 && !isCreating && (
          <p className="text-sm text-muted-foreground">
            Alle Status wurden bereits konfiguriert. Sie können bestehende Benachrichtigungen bearbeiten oder löschen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}