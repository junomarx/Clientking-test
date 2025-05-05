import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileBadge, Plus, Save, Trash2, Pencil, FileCode, Check } from 'lucide-react';

interface PrintTemplate {
  id: number;
  name: string;
  type: string;
  content: string;
  variables: string[];
  userId: number | null;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

export default function SuperadminPrintTemplatesTab() {
  const { toast } = useToast();
  
  // States für Druckvorlagen
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'receipt_58mm',
    content: '',
    variables: [] as string[]
  });
  
  // Druckvorlagen Datenabruf
  const { data: printTemplates, isLoading: isLoadingTemplates, error: templatesError, refetch: refetchTemplates } = useQuery<PrintTemplate[]>({
    queryKey: ["/api/superadmin/print-templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/superadmin/print-templates");
      return await res.json();
    }
  });
  
  // Standard-Druckvorlagen erstellen
  const createDefaultTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/superadmin/print-templates/create-default-templates");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Standard-Vorlagen erstellt",
        description: "Die Druck-Standard-Vorlagen wurden erfolgreich erstellt.",
        variant: "default",
      });
      // Vorlagenliste aktualisieren
      refetchTemplates();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Erstellen der Standard-Vorlagen",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Fehlerbehandlung für Druckvorlagen
  useEffect(() => {
    if (templatesError instanceof Error) {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Laden der Druckvorlagen',
        description: templatesError.message
      });
    }
  }, [templatesError, toast]);
  
  // Druckvorlage erstellen
  const createTemplateMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      const response = await apiRequest('POST', '/api/superadmin/print-templates', template);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/print-templates'] });
      setIsCreateTemplateOpen(false);
      setNewTemplate({ name: '', type: 'receipt_58mm', content: '', variables: [] });
      toast({
        title: 'Vorlage erstellt',
        description: 'Die Druckvorlage wurde erfolgreich erstellt.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Erstellen der Vorlage',
        description: error.message
      });
    }
  });
  
  // Druckvorlage aktualisieren
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: number, template: Partial<PrintTemplate> }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/print-templates/${id}`, template);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/print-templates'] });
      setIsEditTemplateOpen(false);
      setSelectedTemplate(null);
      toast({
        title: 'Vorlage aktualisiert',
        description: 'Die Druckvorlage wurde erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Aktualisieren der Vorlage',
        description: error.message
      });
    }
  });
  
  // Druckvorlage löschen
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/print-templates/${id}`);
      return response.status === 204 ? {} : await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/print-templates'] });
      toast({
        title: 'Vorlage gelöscht',
        description: 'Die Druckvorlage wurde erfolgreich gelöscht.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Löschen der Vorlage',
        description: error.message
      });
    }
  });
  
  // Neue Vorlage erstellen
  const handleCreateTemplate = () => {
    // Einfache Validierung
    if (!newTemplate.name || !newTemplate.type || !newTemplate.content) {
      toast({
        variant: 'destructive',
        title: 'Unvollständige Daten',
        description: 'Bitte füllen Sie alle Pflichtfelder aus.'
      });
      return;
    }
    
    createTemplateMutation.mutate(newTemplate);
  };
  
  // Vorlage zur Bearbeitung auswählen
  const handleEditTemplate = (template: PrintTemplate) => {
    setSelectedTemplate(template);
    setIsEditTemplateOpen(true);
  };
  
  // Vorlage aktualisieren
  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      template: {
        name: selectedTemplate.name,
        type: selectedTemplate.type,
        content: selectedTemplate.content,
        variables: selectedTemplate.variables
      }
    });
  };
  
  // Vorlage löschen
  const handleDeleteTemplate = (id: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?')) {
      deleteTemplateMutation.mutate(id);
    }
  };
  
  // Variablen aus dem Body extrahieren (Muster: {{variableName}})
  const extractVariables = (body: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };
  
  // Automatisch Variablen extrahieren, wenn der Body geändert wird
  useEffect(() => {
    if (isCreateTemplateOpen) {
      const variables = extractVariables(newTemplate.content);
      setNewTemplate(prev => ({ ...prev, variables }));
    }
  }, [newTemplate.content, isCreateTemplateOpen]);
  
  useEffect(() => {
    if (isEditTemplateOpen && selectedTemplate) {
      const variables = extractVariables(selectedTemplate.content);
      setSelectedTemplate(prev => prev ? { ...prev, variables } : null);
    }
  }, [selectedTemplate?.content, isEditTemplateOpen]);
  
  // Typbeschreibungen für die Druckvorlagen
  const templateTypes = [
    { value: 'receipt_58mm', label: 'Bondruck 58mm' },
    { value: 'receipt_80mm', label: 'Bondruck 80mm' },
    { value: 'invoice_a4', label: 'DIN A4 Ausdruck' },
    { value: 'label', label: 'Etikett' }
  ];
  
  // Typbezeichnung ermitteln
  const getTemplateTypeLabel = (type: string): string => {
    const foundType = templateTypes.find(t => t.value === type);
    return foundType ? foundType.label : type;
  };
  
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Druckvorlagen</h2>
          <p className="text-muted-foreground">
            Verwalten Sie globale Druckvorlagen für Abholscheine, Rechnungen und Etiketten.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileCode className="h-5 w-5 mr-2" />
              <CardTitle>Druckvorlagen</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => createDefaultTemplatesMutation.mutate()}
                disabled={createDefaultTemplatesMutation.isPending}
              >
                {createDefaultTemplatesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileBadge className="h-4 w-4 mr-2" />
                )}
                Standard-Druckvorlagen
              </Button>
              <Button onClick={() => setIsCreateTemplateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Neue Vorlage
              </Button>
            </div>
          </div>
          <CardDescription>
            Verwalten Sie Druckvorlagen für Ihre Ausdrucke. Sie können Variablen wie {`{{businessName}}`} verwenden, die beim Druck automatisch ersetzt werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTemplates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : printTemplates && printTemplates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Variablen</TableHead>
                  <TableHead>Zuletzt aktualisiert</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{getTemplateTypeLabel(template.type)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.variables && template.variables.length > 0 ? (
                          template.variables.slice(0, 3).map((variable, index) => (
                            <Badge key={index} variant="outline">{variable}</Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Keine Variablen</span>
                        )}
                        {template.variables && template.variables.length > 3 && (
                          <Badge variant="outline">+{template.variables.length - 3} weitere</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(template.updatedAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={deleteTemplateMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Keine Vorlagen gefunden</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Es wurden noch keine Druckvorlagen erstellt. 
                Erstellen Sie jetzt Ihre erste Vorlage oder verwenden Sie die Standard-Druckvorlagen.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => createDefaultTemplatesMutation.mutate()}
                  disabled={createDefaultTemplatesMutation.isPending}
                >
                  {createDefaultTemplatesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileBadge className="h-4 w-4 mr-2" />
                  )}
                  Standard-Vorlagen erstellen
                </Button>
                <Button onClick={() => setIsCreateTemplateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Vorlage
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog: Neue Druckvorlage erstellen */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Druckvorlage erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Druckvorlage, die von allen Benutzern verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Name der Vorlage</Label>
                  <Input
                    id="templateName"
                    placeholder="z.B. Mein angepasster Bondruck"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="templateType">Typ</Label>
                  <Select
                    value={newTemplate.type}
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie einen Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateContent">HTML-Inhalt</Label>
                <Textarea
                  id="templateContent"
                  rows={20}
                  placeholder="<html>...</html>"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Verwenden Sie {`{{variableName}}`} für dynamische Inhalte, z.B. {`{{businessName}}`}, {`{{customerName}}`}, etc.
                </p>
              </div>
              
              {newTemplate.variables.length > 0 && (
                <div className="space-y-2">
                  <Label>Erkannte Variablen</Label>
                  <div className="flex flex-wrap gap-2">
                    {newTemplate.variables.map((variable, index) => (
                      <Badge key={index} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>Abbrechen</Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Vorlage erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog: Druckvorlage bearbeiten */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Druckvorlage bearbeiten</DialogTitle>
            <DialogDescription>
              Ändern Sie die Vorlage nach Ihren Wünschen. Variablen werden automatisch erkannt.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editTemplateName">Name der Vorlage</Label>
                    <Input
                      id="editTemplateName"
                      value={selectedTemplate.name}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editTemplateType">Typ</Label>
                    <Select
                      value={selectedTemplate.type}
                      onValueChange={(value) => setSelectedTemplate({ ...selectedTemplate, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie einen Typ" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editTemplateContent">HTML-Inhalt</Label>
                  <Textarea
                    id="editTemplateContent"
                    rows={20}
                    value={selectedTemplate.content}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    Verwenden Sie {`{{variableName}}`} für dynamische Inhalte, z.B. {`{{businessName}}`}, {`{{customerName}}`}, etc.
                  </p>
                </div>
                
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Erkannte Variablen</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>Abbrechen</Button>
            <Button 
              onClick={handleUpdateTemplate}
              disabled={updateTemplateMutation.isPending}
            >
              {updateTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Änderungen speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
