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
import { Loader2, Trash2, Edit, Phone, Plus, MessageSquare } from 'lucide-react';
import type { SmsTemplate as DBSmsTemplate } from '@shared/schema';

// Erweiterte SmsTemplate-Schnittstelle für unser UI
interface SmsTemplate extends DBSmsTemplate {
  description?: string;
}

// Interface für das Formular zum Erstellen/Bearbeiten von Vorlagen
interface SmsTemplateFormData {
  name: string;
  body: string;
  description: string;
  variables: string[];
}

// Komponente für den SMS-Template Tab
export function SmsTemplateTab() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Abfrage aller SMS-Vorlagen
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/sms-templates'],
    queryFn: () => fetch('/api/sms-templates').then(res => {
      if (!res.ok) throw new Error('Fehler beim Laden der SMS-Vorlagen');
      return res.json();
    })
  });

  // Mutation zum Erstellen einer neuen Vorlage
  const createTemplateMutation = useMutation({
    mutationFn: async (template: SmsTemplateFormData) => {
      const res = await apiRequest('POST', '/api/sms-templates', template);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Erfolg',
        description: 'SMS-Vorlage wurde erstellt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms-templates'] });
      setIsSheetOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Erstellen der SMS-Vorlage: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation zum Aktualisieren einer Vorlage
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: number; template: Partial<SmsTemplateFormData> }) => {
      const res = await apiRequest('PATCH', `/api/sms-templates/${id}`, template);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Erfolg',
        description: 'SMS-Vorlage wurde aktualisiert.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms-templates'] });
      setIsSheetOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der SMS-Vorlage: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation zum Löschen einer Vorlage
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/sms-templates/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Erfolg',
        description: 'SMS-Vorlage wurde gelöscht.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms-templates'] });
      setIsAlertDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen der SMS-Vorlage: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation zum Senden einer SMS
  const sendSmsMutation = useMutation({
    mutationFn: async ({ templateId, phoneNumber, variables }: { templateId: number; phoneNumber: string; variables: Record<string, string> }) => {
      const res = await apiRequest('POST', '/api/send-sms', { templateId, phoneNumber, variables });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Erfolg',
        description: 'SMS wurde gesendet.',
      });
      setIsSendDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Senden der SMS: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Funktion zum Öffnen des Bearbeitungsformulars
  const handleEditTemplate = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setIsSheetOpen(true);
  };

  // Funktion zum Öffnen des Formular für eine neue Vorlage
  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setIsSheetOpen(true);
  };

  // Funktion zum Speichern einer Vorlage (neu oder bearbeitet)
  const handleSaveTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get('name') as string;
    const body = formData.get('body') as string;
    const variablesString = formData.get('variables') as string;
    
    // Variablen als Array speichern (kommagetrennt)
    const variables = variablesString.split(',').map(v => v.trim()).filter(v => v.length > 0);
    
    if (editingTemplate) {
      // Vorlage aktualisieren
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        template: { name, body, variables }
      });
    } else {
      // Neue Vorlage erstellen
      createTemplateMutation.mutate({
        name,
        body,
        description: '',
        variables
      });
    }
  };

  // Funktion zum Bestätigen des Löschens einer Vorlage
  const handleConfirmDelete = () => {
    if (templateToDelete !== null) {
      deleteTemplateMutation.mutate(templateToDelete);
    }
  };

  // Funktion zum Öffnen des Lösch-Dialogs
  const handleDeleteClick = (id: number) => {
    setTemplateToDelete(id);
    setIsAlertDialogOpen(true);
  };

  // Funktion zum Öffnen des SMS-Versand-Dialogs
  const handleSendSmsClick = (template: SmsTemplate) => {
    setSelectedTemplateId(template.id);
    setPhoneNumber('');
    
    // Initialisiere Variablen-Objekt für alle Variablen in der Vorlage
    const initialVariables: Record<string, string> = {};
    if (template.variables && Array.isArray(template.variables)) {
      template.variables.forEach(variable => {
        initialVariables[variable] = '';
      });
    }
    setVariables(initialVariables);
    
    setIsSendDialogOpen(true);
  };

  // Funktion zum Senden einer SMS
  const handleSendSms = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedTemplateId || !phoneNumber) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine Telefonnummer ein.',
        variant: 'destructive',
      });
      return;
    }
    
    sendSmsMutation.mutate({
      templateId: selectedTemplateId,
      phoneNumber,
      variables
    });
  };

  // Funktion zum Aktualisieren des Variablenwerts
  const handleVariableChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">SMS-Vorlagen</h2>
          <p className="text-sm text-muted-foreground">
            Erstellen und verwalten Sie SMS-Vorlagen für die Kundenkommunikation.
          </p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Variablen</TableHead>
                <TableHead className="w-[150px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template: SmsTemplate) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="font-medium">{template.name}</div>
                  </TableCell>
                  <TableCell>
                    {template.variables && Array.isArray(template.variables) && template.variables.length > 0
                      ? template.variables.join(', ')
                      : <span className="text-muted-foreground">Keine Variablen</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleSendSmsClick(template)}>
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="mb-2">Keine SMS-Vorlagen vorhanden</p>
            <p className="text-sm text-muted-foreground mb-4">
              Erstellen Sie Ihre erste SMS-Vorlage, um mit Ihren Kunden zu kommunizieren.
            </p>
            <Button onClick={handleNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Vorlage
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formular zum Erstellen/Bearbeiten einer Vorlage */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingTemplate ? 'SMS-Vorlage bearbeiten' : 'Neue SMS-Vorlage'}</SheetTitle>
            <SheetDescription>
              {editingTemplate 
                ? 'Bearbeiten Sie die ausgewählte SMS-Vorlage.'
                : 'Erstellen Sie eine neue SMS-Vorlage für die Kommunikation mit Kunden.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                name="name" 
                defaultValue={editingTemplate?.name || ''} 
                placeholder="z.B. Abholbenachrichtigung" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variables">Variablen (kommagetrennt)</Label>
              <Input 
                id="variables" 
                name="variables" 
                defaultValue={editingTemplate?.variables ? 
                  (Array.isArray(editingTemplate.variables) ? 
                    editingTemplate.variables.join(', ') : '') : ''} 
                placeholder="z.B. kundenname, auftragsnummer, datum" 
              />
              <p className="text-sm text-muted-foreground">
                Variablen im Textkörper mit {"{{"} variablename {"}}"}  verwenden
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">SMS-Text</Label>
              <Textarea 
                id="body" 
                name="body" 
                defaultValue={editingTemplate?.body || ''} 
                placeholder="Sehr geehrte(r) {{kundenname}}, Ihr Gerät mit der Auftragsnummer {{auftragsnummer}} ist zur Abholung bereit." 
                rows={5} 
                required 
              />
              <p className="text-sm text-muted-foreground">
                Maximale Länge einer SMS: 160 Zeichen
              </p>
            </div>
            <SheetFooter className="pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline">Abbrechen</Button>
              </SheetClose>
              <Button 
                type="submit" 
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Speichern
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog zum Bestätigen des Löschens */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>SMS-Vorlage löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diese SMS-Vorlage löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog zum Senden einer SMS */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>SMS versenden</DialogTitle>
            <DialogDescription>
              Senden Sie eine SMS mit der ausgewählten Vorlage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendSms} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Telefonnummer</Label>
              <Input 
                id="phoneNumber" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                placeholder="+43123456789" 
                required 
              />
              <p className="text-sm text-muted-foreground">
                Die Telefonnummer sollte im internationalen Format sein, z.B. +43123456789
              </p>
            </div>
            
            {selectedTemplateId && templates && variables && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Variablen</h4>
                {Object.keys(variables).length > 0 ? (
                  Object.keys(variables).map((varName) => (
                    <div key={varName} className="space-y-2">
                      <Label htmlFor={`var-${varName}`}>{varName}</Label>
                      <Input 
                        id={`var-${varName}`} 
                        value={variables[varName]} 
                        onChange={(e) => handleVariableChange(varName, e.target.value)} 
                        placeholder={`Wert für ${varName}`} 
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Diese Vorlage enthält keine Variablen.
                  </p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={sendSmsMutation.isPending || !phoneNumber}
              >
                {sendSmsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                SMS senden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}