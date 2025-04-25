import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Edit, Mail, Plus, MessageSquare } from 'lucide-react';
import type { EmailTemplate as DBEmailTemplate } from '@shared/schema';

// Erweiterte EmailTemplate-Schnittstelle für unser UI
interface EmailTemplate extends DBEmailTemplate {
  description?: string;
}

// Interface für das Formular zum Erstellen/Bearbeiten von Vorlagen
interface EmailTemplateFormData {
  name: string;
  subject: string;
  body: string;
  description: string;
  variables: string[];
}

// Komponente für den Email-Template Tab
export function EmailTemplateTab() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Abfrage aller E-Mail-Vorlagen
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/email-templates'],
    queryFn: () => fetch('/api/email-templates').then(res => {
      if (!res.ok) throw new Error('Fehler beim Laden der E-Mail-Vorlagen');
      return res.json();
    })
  });

  // Mutation zum Erstellen einer neuen Vorlage
  const createMutation = useMutation({
    mutationFn: async (data: EmailTemplateFormData) => {
      const response = await apiRequest('POST', '/api/email-templates', {
        name: data.name,
        subject: data.subject,
        body: data.body,
        description: data.description,
        variables: data.variables.join(',')
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsSheetOpen(false);
      toast({
        title: 'Vorlage erstellt',
        description: 'Die E-Mail-Vorlage wurde erfolgreich erstellt.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: `Fehler beim Erstellen der Vorlage: ${error.message}`
      });
    }
  });

  // Mutation zum Aktualisieren einer Vorlage
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<EmailTemplateFormData> }) => {
      const templateData: any = { ...data };
      
      // Konvertiere variables zurück in einen String für die API
      if (data.variables) {
        templateData.variables = data.variables.join(',');
      }
      
      const response = await apiRequest('PATCH', `/api/email-templates/${id}`, templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsSheetOpen(false);
      toast({
        title: 'Vorlage aktualisiert',
        description: 'Die E-Mail-Vorlage wurde erfolgreich aktualisiert.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der Vorlage: ${error.message}`
      });
    }
  });

  // Mutation zum Löschen einer Vorlage
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({
        title: 'Vorlage gelöscht',
        description: 'Die E-Mail-Vorlage wurde erfolgreich gelöscht.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: `Fehler beim Löschen der Vorlage: ${error.message}`
      });
    }
  });

  // Mutation zum Senden einer E-Mail mit einer Vorlage
  const sendEmailMutation = useMutation({
    mutationFn: async ({ templateId, to, variables }: { templateId: number, to: string, variables: Record<string, string> }) => {
      const response = await apiRequest('POST', '/api/send-email', { templateId, to, variables });
      return response.json();
    },
    onSuccess: () => {
      setIsSendDialogOpen(false);
      toast({
        title: 'E-Mail gesendet',
        description: 'Die E-Mail wurde erfolgreich gesendet.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: `Fehler beim Senden der E-Mail: ${error.message}`
      });
    }
  });

  const handleCreateTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const description = formData.get('description') as string;
    const variablesStr = formData.get('variables') as string;
    const variables = variablesStr.split(',').map(v => v.trim()).filter(v => v);

    createMutation.mutate({
      name,
      subject,
      body,
      description,
      variables
    });
  };

  const handleUpdateTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const description = formData.get('description') as string;
    const variablesStr = formData.get('variables') as string;
    const variables = variablesStr.split(',').map(v => v.trim()).filter(v => v);

    updateMutation.mutate({
      id: editingTemplate.id,
      data: {
        name,
        subject,
        body,
        description,
        variables
      }
    });
  };

  const handleDelete = (id: number) => {
    setTemplateToDelete(id);
    setIsAlertDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete !== null) {
      deleteMutation.mutate(templateToDelete);
      setIsAlertDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const openCreateSheet = () => {
    setEditingTemplate(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (template: EmailTemplate) => {
    // Konvertiere den variables-String in ein Array für das Formular
    const templateWithArrayVars = {
      ...template,
      variables: typeof template.variables === 'string' 
        ? template.variables.split(',').map((v: string) => v.trim()) 
        : (template.variables || [])
    } as EmailTemplate & { variables: string[] };
    
    setEditingTemplate(templateWithArrayVars);
    setIsSheetOpen(true);
  };

  const openSendDialog = (templateId: number) => {
    const template = templates?.find((t: EmailTemplate) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      
      // Initialisiere die Variablen-State mit leeren Werten für alle Variablen dieser Vorlage
      const initialVars: Record<string, string> = {};
      if (template.variables) {
        const varsArray = typeof template.variables === 'string' 
          ? template.variables.split(',') 
          : template.variables;
          
        if (Array.isArray(varsArray)) {
          varsArray.forEach((v: string) => {
            const varName = v.trim();
            if (varName) initialVars[varName] = '';
          });
        }
      }
      
      setVariables(initialVars);
      setIsSendDialogOpen(true);
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTemplateId && emailAddress) {
      sendEmailMutation.mutate({
        templateId: selectedTemplateId,
        to: emailAddress,
        variables
      });
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">E-Mail-Vorlagen</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre E-Mail-Vorlagen für automatisierte Kundenkommunikation.
          </p>
        </div>
        <Button onClick={openCreateSheet}>
          <Plus className="mr-2 h-4 w-4" /> Neue Vorlage
        </Button>
      </div>

      {templates?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Keine Vorlagen vorhanden</h3>
            <p className="text-center text-muted-foreground mt-2">
              Sie haben noch keine E-Mail-Vorlagen erstellt. Klicken Sie auf "Neue Vorlage",
              um Ihre erste Vorlage zu erstellen.
            </p>
            <Button onClick={openCreateSheet} className="mt-4">
              <Plus className="mr-2 h-4 w-4" /> Neue Vorlage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {templates?.map((template: EmailTemplate) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="relative pb-2">
                  <div className="absolute right-4 top-4 flex space-x-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => openSendDialog(template.id)}
                      title="E-Mail mit dieser Vorlage senden"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => openEditSheet(template)}
                      title="Vorlage bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDelete(template.id)}
                      title="Vorlage löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>
                    {template.description || 'Keine Beschreibung vorhanden'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <h4 className="text-sm font-semibold mb-1">Betreff:</h4>
                  <p className="text-sm mb-3 text-muted-foreground">{template.subject}</p>
                  
                  <h4 className="text-sm font-semibold mb-1">Variablen:</h4>
                  <p className="text-sm mb-3 text-muted-foreground">
                    {template.variables ? 
                      (typeof template.variables === 'string' 
                        ? template.variables.split(',').map((v: string) => `{{${v.trim()}}}`).join(', ')
                        : (Array.isArray(template.variables)
                           ? template.variables.map((v: string) => `{{${v.trim()}}}`).join(', ')
                           : 'Keine Variablen')
                      ) : 
                      'Keine Variablen'
                    }
                  </p>
                  
                  <h4 className="text-sm font-semibold mb-1">Inhalt:</h4>
                  <div className="text-sm border rounded-md p-2 max-h-32 overflow-auto">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {template.body.length > 200 ? 
                        `${template.body.substring(0, 200)}...` : 
                        template.body
                      }
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end bg-muted/20 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleString()}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Sheet für das Erstellen/Bearbeiten von Vorlagen */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</SheetTitle>
            <SheetDescription>
              Erstellen Sie eine E-Mail-Vorlage mit Variablen für personalisierte Nachrichten.
              Variablen werden im Format {'{{'} Variable {'}}' } eingefügt.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name der Vorlage</Label>
              <Input
                id="name"
                name="name"
                placeholder="z.B. Reparatur abgeschlossen"
                defaultValue={editingTemplate?.name || ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Kurze Beschreibung der Vorlage"
                defaultValue={editingTemplate?.description || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="z.B. Ihre Reparatur ist abgeschlossen"
                defaultValue={editingTemplate?.subject || ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variables">Variablen (durch Komma getrennt)</Label>
              <Input
                id="variables"
                name="variables"
                placeholder="z.B. kundenName, reparaturCode, abholDatum"
                defaultValue={editingTemplate?.variables ? 
                  (Array.isArray(editingTemplate.variables) ? 
                    editingTemplate.variables.join(',') : 
                    editingTemplate.variables
                  ) : ''
                }
              />
              <p className="text-xs text-muted-foreground">
                Diese Variablen können im Betreff und Inhalt im Format {{variableName}} verwendet werden.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Inhalt</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Schreiben Sie hier den Inhalt Ihrer E-Mail."
                defaultValue={editingTemplate?.body || ''}
                className="min-h-[200px]"
                required
              />
            </div>
            <SheetFooter className="pt-2">
              <SheetClose asChild>
                <Button type="button" variant="outline">Abbrechen</Button>
              </SheetClose>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog zum Senden einer E-Mail */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>E-Mail senden</DialogTitle>
            <DialogDescription>
              Senden Sie eine E-Mail mit der ausgewählten Vorlage. Füllen Sie die Variablen aus.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendEmail}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse des Empfängers</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  required
                />
              </div>
              
              {/* Eingabefelder für Variablen */}
              {Object.keys(variables).length > 0 && (
                <div className="space-y-3">
                  <Label>Variablen:</Label>
                  {Object.keys(variables).map(key => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={`var-${key}`} className="text-sm">
                        {key}
                      </Label>
                      <Input
                        id={`var-${key}`}
                        value={variables[key]}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                        placeholder={`Wert für ${key}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSendDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={sendEmailMutation.isPending || !emailAddress}
              >
                {sendEmailMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Senden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog für Löschbestätigung */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorlage löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese E-Mail-Vorlage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}