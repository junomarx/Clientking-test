import React, { useState, useEffect } from 'react';
import { isProfessionalOrHigher } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Pencil, Trash2, Plus, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Definieren des Template-Typs
interface DocumentTemplate {
  id: string;
  name: string;
  type: string; // Der Vorlagentyp (repair_order, cost_estimate, receipt)
  content: string; // HTML oder ähnliches Format
}

// Schema für neue Vorlagen
const templateSchema = z.object({
  name: z.string().min(1, 'Der Name der Vorlage ist erforderlich'),
  type: z.string().min(1, 'Bitte wählen Sie einen Vorlagentyp'),
  content: z.string().min(1, 'Der Inhalt der Vorlage ist erforderlich'),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// Zustandsvariablen für die A4-Druckoption
interface A4PrintSettings {
  printA4Enabled: boolean;
}

export function DocumentTemplatesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<DocumentTemplate | null>(null);
  const [printA4Enabled, setPrintA4Enabled] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form für neue/bearbeitende Vorlagen
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      type: '',
      content: '',
    },
  });

  // Template-Typen
  const templateTypes = [
    { id: 'repair_order', name: 'Reparaturauftrag' },
    { id: 'cost_estimate', name: 'Kostenvoranschlag' },
    { id: 'receipt', name: 'Quittung' },
  ];

  // Laden der Vorlagen vom Server
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/document-templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/document-templates');
      if (!res.ok) throw new Error('Fehler beim Laden der Dokumentenvorlagen');
      return res.json();
    },
    enabled: !!user,
  });

  // Mutation zum Speichern einer neuen Vorlage
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const res = await apiRequest('POST', '/api/document-templates', data);
      if (!res.ok) throw new Error('Fehler beim Speichern der Vorlage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: 'Vorlage gespeichert',
        description: 'Die Dokumentenvorlage wurde erfolgreich gespeichert.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Speichern der Vorlage: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation zum Aktualisieren einer Vorlage
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues & { id: string }) => {
      const { id, ...templateData } = data;
      const res = await apiRequest('PATCH', `/api/document-templates/${id}`, templateData);
      if (!res.ok) throw new Error('Fehler beim Aktualisieren der Vorlage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      setIsDialogOpen(false);
      setEditTemplate(null);
      form.reset();
      toast({
        title: 'Vorlage aktualisiert',
        description: 'Die Dokumentenvorlage wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der Vorlage: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation zum Löschen einer Vorlage
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/document-templates/${id}`);
      if (!res.ok) throw new Error('Fehler beim Löschen der Vorlage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      toast({
        title: 'Vorlage gelöscht',
        description: 'Die Dokumentenvorlage wurde erfolgreich gelöscht.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen der Vorlage: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: TemplateFormValues) => {
    if (editTemplate) {
      updateTemplateMutation.mutate({ ...values, id: editTemplate.id });
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const handleEdit = (template: DocumentTemplate) => {
    setEditTemplate(template);
    form.reset({
      name: template.name,
      type: template.type,
      content: template.content,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditTemplate(null);
    form.reset();
  };

  function getTemplateTypeName(typeId: string): string {
    const type = templateTypes.find(t => t.id === typeId);
    return type ? type.name : typeId;
  }

  // Laden der A4-Druckeinstellungen
  const { data: a4PrintSettings, isLoading: isLoadingA4Print } = useQuery({
    queryKey: ["/api/business-settings/a4-print"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/business-settings/a4-print");
      if (!res.ok) throw new Error("Fehler beim Laden der DIN A4-Druckeinstellungen");
      return res.json();
    },
    enabled: !!user
  });
  
  // Aktualisiere den Zustand, wenn Daten geladen sind
  useEffect(() => {
    if (a4PrintSettings) {
      setPrintA4Enabled(a4PrintSettings.printA4Enabled);
    }
  }, [a4PrintSettings]);

  // Mutation für den A4-Druckmodus
  const updateA4PrintMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PUT", "/api/business-settings/a4-print", { printA4Enabled: enabled });
      if (!res.ok) throw new Error("Fehler beim Aktualisieren der DIN A4-Druckeinstellungen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings/a4-print"] });
      toast({
        title: "DIN A4-Druckeinstellungen aktualisiert",
        description: printA4Enabled 
          ? "DIN A4-Ausdrucke wurden aktiviert."
          : "DIN A4-Ausdrucke wurden deaktiviert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Aktualisieren der DIN A4-Druckeinstellungen: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Prüfen, ob der Benutzer Professional oder höher ist
  useEffect(() => {
    if (user) {
      setIsPro(isProfessionalOrHigher(user));
    }
  }, [user]);
  
  // Handler für den DIN A4-Druckmodus Switch
  const handleA4PrintToggle = (checked: boolean) => {
    setPrintA4Enabled(checked);
    updateA4PrintMutation.mutate(checked);
  };
  
  return (
    <div className="space-y-4">
      {/* DIN A4-Druckeinstellungen */}
      <div className="p-4 border rounded-md mb-6">
        <h3 className="text-lg font-medium mb-4">DIN A4-Druckfunktion</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">DIN A4-Ausdrucke aktivieren</h4>
            <p className="text-sm text-muted-foreground">Ermöglicht das Drucken von Reparaturaufträgen im DIN A4-Format</p>
          </div>
          <Switch
            checked={printA4Enabled}
            onCheckedChange={handleA4PrintToggle}
            disabled={isLoadingA4Print || updateA4PrintMutation.isPending || !isPro}
          />
        </div>
        
        {!isPro && (
          <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded text-sm">
            Diese Funktion ist nur in Professional- und Enterprise-Paketen verfügbar.
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Benutzerdefinierte Dokumentenvorlagen</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditTemplate(null);
                form.reset({
                  name: '',
                  type: '',
                  content: '',
                });
              }}
              className="ml-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Neue Vorlage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
              </DialogTitle>
              <DialogDescription>
                Erstellen oder bearbeiten Sie benutzerdefinierte Vorlagen für Ihre Dokumente.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name der Vorlage</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Standard Reparaturauftrag" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorlagentyp</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vorlagentyp auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templateTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Inhaltsvorlage</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>
                                Verwenden Sie diese Platzhalter in Ihrer Vorlage:
                                <br />
                                &#123;&#123;geschaeftsname&#125;&#125; - Name des Geschäfts
                                <br />
                                &#123;&#123;reparatur_nr&#125;&#125; - Reparaturnummer
                                <br />
                                &#123;&#123;kunde_name&#125;&#125; - Name des Kunden
                                <br />
                                &#123;&#123;geraet&#125;&#125; - Geräteinformationen
                                <br />
                                &#123;&#123;datum&#125;&#125; - Aktuelles Datum
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Geben Sie hier den Inhalt der Vorlage ein. HTML wird unterstützt."
                          {...field}
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                    {createTemplateMutation.isPending || updateTemplateMutation.isPending
                      ? 'Wird gespeichert...'
                      : editTemplate
                      ? 'Aktualisieren'
                      : 'Speichern'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-4 text-center">Vorlagen werden geladen...</div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Keine benutzerdefinierten Vorlagen vorhanden.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template: DocumentTemplate) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                      {template.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTemplateTypeName(template.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Hier können Sie benutzerdefinierte Vorlagen für Ihre Ausdrucke erstellen.
        Diese Vorlagen werden beim Drucken von Dokumenten verwendet.
      </p>
    </div>
  );
}