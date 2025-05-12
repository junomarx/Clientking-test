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
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Plus, Save, Server, Trash2, Pencil, MailCheck, Send, FileText, Check } from 'lucide-react';

interface GlobalEmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpSenderName: string;
  smtpSenderEmail: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  userId: number | null;
  shopId: number;
  createdAt: string;
  updatedAt: string;
  type?: 'app' | 'customer'; // Typ der Vorlage (System oder Kunde)
}

export default function SuperadminEmailTab() {
  const { toast } = useToast();
  
  // States für SMTP-Einstellungen
  const [emailSettings, setEmailSettings] = useState<GlobalEmailSettings>({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpSenderName: '',
    smtpSenderEmail: ''
  });
  
  // States für E-Mail-Vorlagen
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    variables: [] as string[],
    type: 'customer' as 'app' | 'customer' // Standardmäßig eine Kunden-Vorlage
  });
  
  // SMTP-Konfiguration abrufen
  const { data: smtpConfig, isLoading: isLoadingConfig } = useQuery<GlobalEmailSettings>({
    queryKey: ['/api/superadmin/email/config']
  });
  
  // Callback für SMTP-Konfiguration-Fehler
  useEffect(() => {
    if (smtpConfig) {
      setEmailSettings(smtpConfig);
    }
  }, [smtpConfig]);
  
  // E-Mail-Vorlagen abrufen
  // Standard-App-Vorlagen erstellen
  const createDefaultTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/superadmin/email/create-default-templates");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Standard-Vorlagen erstellt",
        description: "Die App-Standard-E-Mail-Vorlagen wurden erfolgreich erstellt.",
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

  const { data: emailTemplates, isLoading: isLoadingTemplates, error: templatesError, refetch: refetchTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/superadmin/email/templates']
  });
  
  // Fehlerbehandlung für E-Mail-Vorlagen
  useEffect(() => {
    if (templatesError instanceof Error) {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Laden der E-Mail-Vorlagen',
        description: templatesError.message
      });
    }
  }, [templatesError, toast]);
  
  // SMTP-Konfiguration speichern
  const saveSmtpConfigMutation = useMutation({
    mutationFn: async (config: GlobalEmailSettings) => {
      const response = await apiRequest('POST', '/api/superadmin/email/config', config);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email/config'] });
      toast({
        title: 'SMTP-Konfiguration gespeichert',
        description: 'Die E-Mail-Einstellungen wurden erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Speichern',
        description: error.message
      });
    }
  });
  
  // E-Mail-Vorlage erstellen
  const createTemplateMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      const response = await apiRequest('POST', '/api/superadmin/email/templates', template);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email/templates'] });
      setIsCreateTemplateOpen(false);
      setNewTemplate({ name: '', subject: '', body: '', variables: [], type: 'customer' });
      toast({
        title: 'Vorlage erstellt',
        description: 'Die E-Mail-Vorlage wurde erfolgreich erstellt.'
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
  
  // E-Mail-Vorlage aktualisieren
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, template }: { id: number, template: Partial<EmailTemplate> }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/email/templates/${id}`, template);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email/templates'] });
      setIsEditTemplateOpen(false);
      setSelectedTemplate(null);
      toast({
        title: 'Vorlage aktualisiert',
        description: 'Die E-Mail-Vorlage wurde erfolgreich aktualisiert.'
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
  
  // E-Mail-Vorlage löschen
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/email/templates/${id}`);
      return response.status === 204 ? {} : await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email/templates'] });
      toast({
        title: 'Vorlage gelöscht',
        description: 'Die E-Mail-Vorlage wurde erfolgreich gelöscht.'
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
  
  // Test-E-Mail senden
  const sendTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/superadmin/email/test', { email });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Test-E-Mail gesendet',
        description: 'Die Test-E-Mail wurde erfolgreich versendet.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden der Test-E-Mail',
        description: error.message
      });
    }
  });
  
  // SMTP-Einstellungen ändern
  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // SMTP-Konfiguration speichern
  const handleSaveSmtpConfig = () => {
    saveSmtpConfigMutation.mutate(emailSettings);
  };
  
  // Test-E-Mail senden
  const handleSendTestEmail = () => {
    // Verwende die E-Mail-Adresse aus den Einstellungen
    if (emailSettings.smtpSenderEmail) {
      sendTestEmailMutation.mutate(emailSettings.smtpSenderEmail);
    } else {
      toast({
        variant: 'destructive',
        title: 'Keine E-Mail-Adresse',
        description: 'Bitte geben Sie eine Absender-E-Mail-Adresse ein.'
      });
    }
  };
  
  // Neue Vorlage erstellen
  const handleCreateTemplate = () => {
    // Einfache Validierung
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
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
  const handleEditTemplate = (template: EmailTemplate) => {
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
        subject: selectedTemplate.subject,
        body: selectedTemplate.body,
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
      const variables = extractVariables(newTemplate.body);
      setNewTemplate(prev => ({ ...prev, variables }));
    }
  }, [newTemplate.body, isCreateTemplateOpen]);
  
  useEffect(() => {
    if (isEditTemplateOpen && selectedTemplate) {
      const variables = extractVariables(selectedTemplate.body);
      setSelectedTemplate(prev => prev ? { ...prev, variables } : null);
    }
  }, [selectedTemplate?.body, isEditTemplateOpen]);
  
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">E-Mail-Konfiguration</h2>
          <p className="text-muted-foreground">
            Verwalten Sie globale E-Mail-Einstellungen und Vorlagen für das gesamte System.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="smtp" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="smtp">SMTP-Einstellungen</TabsTrigger>
          <TabsTrigger value="templates">E-Mail-Vorlagen</TabsTrigger>
        </TabsList>
        
        {/* SMTP-Einstellungen Tab */}
        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                SMTP-Server-Konfiguration
              </CardTitle>
              <CardDescription>
                Diese Einstellungen werden global für alle E-Mails verwendet, die vom System versendet werden.
                Benutzer können in ihren Einstellungen auch eigene SMTP-Server konfigurieren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfig ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP-Host</Label>
                    <Input
                      id="smtpHost"
                      name="smtpHost"
                      placeholder="smtp.ihredomain.de"
                      value={emailSettings.smtpHost}
                      onChange={handleSmtpChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP-Port</Label>
                    <Input
                      id="smtpPort"
                      name="smtpPort"
                      placeholder="587"
                      value={emailSettings.smtpPort}
                      onChange={handleSmtpChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP-Benutzername</Label>
                    <Input
                      id="smtpUser"
                      name="smtpUser"
                      placeholder="info@ihredomain.de"
                      value={emailSettings.smtpUser}
                      onChange={handleSmtpChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP-Passwort</Label>
                    <Input
                      id="smtpPassword"
                      name="smtpPassword"
                      type="password"
                      placeholder="••••••••"
                      value={emailSettings.smtpPassword}
                      onChange={handleSmtpChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpSenderName">Absendername</Label>
                    <Input
                      id="smtpSenderName"
                      name="smtpSenderName"
                      placeholder="Handyshop Support"
                      value={emailSettings.smtpSenderName}
                      onChange={handleSmtpChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpSenderEmail">Absender-E-Mail</Label>
                    <Input
                      id="smtpSenderEmail"
                      name="smtpSenderEmail"
                      placeholder="info@ihredomain.de"
                      value={emailSettings.smtpSenderEmail}
                      onChange={handleSmtpChange}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleSendTestEmail}
                disabled={saveSmtpConfigMutation.isPending || sendTestEmailMutation.isPending}
              >
                {sendTestEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Test-E-Mail senden
              </Button>
              
              <Button 
                onClick={handleSaveSmtpConfig}
                disabled={saveSmtpConfigMutation.isPending}
              >
                {saveSmtpConfigMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Einstellungen speichern
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* E-Mail-Vorlagen Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  <CardTitle>E-Mail-Vorlagen</CardTitle>
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
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    App-Standardvorlagen
                  </Button>
                  <Button onClick={() => setIsCreateTemplateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Vorlage
                  </Button>
                </div>
              </div>
              <CardDescription>
                Verwalten Sie E-Mail-Vorlagen für verschiedene Benachrichtigungen. Sie können Variablen wie {`{{kundenname}}`} verwenden, die beim Versand automatisch ersetzt werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : emailTemplates && emailTemplates.length > 0 ? (
                <Tabs defaultValue="app" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="app">System-Vorlagen</TabsTrigger>
                    <TabsTrigger value="customer">Kunden-Vorlagen</TabsTrigger>
                  </TabsList>
                  
                  {/* System-Vorlagen Tab */}
                  <TabsContent value="app">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Betreff</TableHead>
                          <TableHead>Variablen</TableHead>
                          <TableHead>Zuletzt aktualisiert</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailTemplates
                          .filter(template => !template.type || template.type === 'app')
                          .map((template) => (
                            <TableRow key={template.id}>
                              <TableCell className="font-medium">{template.name}</TableCell>
                              <TableCell>{template.subject}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {template.variables && template.variables.map((variable, index) => (
                                    <Badge key={index} variant="outline">{variable}</Badge>
                                  ))}
                                  {(!template.variables || template.variables.length === 0) && 
                                    <span className="text-muted-foreground text-sm">Keine Variablen</span>
                                  }
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
                        {emailTemplates.filter(template => !template.type || template.type === 'app').length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              Keine System-Vorlagen gefunden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  
                  {/* Kunden-Vorlagen Tab */}
                  <TabsContent value="customer">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Betreff</TableHead>
                          <TableHead>Variablen</TableHead>
                          <TableHead>Zuletzt aktualisiert</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailTemplates
                          .filter(template => template.type === 'customer')
                          .map((template) => (
                            <TableRow key={template.id}>
                              <TableCell className="font-medium">{template.name}</TableCell>
                              <TableCell>{template.subject}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {template.variables && template.variables.map((variable, index) => (
                                    <Badge key={index} variant="outline">{variable}</Badge>
                                  ))}
                                  {(!template.variables || template.variables.length === 0) && 
                                    <span className="text-muted-foreground text-sm">Keine Variablen</span>
                                  }
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
                        {emailTemplates.filter(template => template.type === 'customer').length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4">
                              Keine Kunden-Vorlagen gefunden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Keine Vorlagen gefunden</h3>
                  <p className="text-muted-foreground mt-2 mb-4">
                    Es wurden noch keine E-Mail-Vorlagen erstellt. 
                    Erstellen Sie jetzt Ihre erste Vorlage.
                  </p>
                  <Button onClick={() => setIsCreateTemplateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Vorlage erstellen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog: Neue E-Mail-Vorlage erstellen */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Neue E-Mail-Vorlage erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue E-Mail-Vorlage, die von allen Benutzern verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateType">Typ der Vorlage</Label>
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="typeApp"
                      name="templateType"
                      value="app"
                      checked={newTemplate.type === 'app'}
                      onChange={() => setNewTemplate({ ...newTemplate, type: 'app' })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="typeApp" className="font-normal">System-Vorlage (für App-Benachrichtigungen)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="typeCustomer"
                      name="templateType"
                      value="customer"
                      checked={newTemplate.type === 'customer'}
                      onChange={() => setNewTemplate({ ...newTemplate, type: 'customer' })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="typeCustomer" className="font-normal">Kunden-Vorlage (für Kundenkommunikation)</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    System-Vorlagen werden für interne App-Benachrichtigungen verwendet, während 
                    Kunden-Vorlagen für die direkte Kommunikation mit Kunden gedacht sind.
                  </p>
                </div>
              </div>
            
              <div className="space-y-2">
                <Label htmlFor="templateName">Name der Vorlage</Label>
                <Input
                  id="templateName"
                  placeholder="z.B. Reparatur abgeschlossen"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateSubject">Betreff</Label>
                <Input
                  id="templateSubject"
                  placeholder="z.B. Ihre Reparatur ist abgeschlossen"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="templateBody">E-Mail-Inhalt (HTML)</Label>
                <Textarea
                  id="templateBody"
                  rows={10}
                  placeholder="<p>Sehr geehrte(r) {`{{kundenname}}`},</p><p>Ihre Reparatur ist abgeschlossen...</p>"
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Verwenden Sie {`{{variableName}}`} für dynamische Inhalte, z.B. {`{{kundenname}}`}, {`{{auftragsnummer}}`}, etc.
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
      
      {/* Dialog: E-Mail-Vorlage bearbeiten */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>E-Mail-Vorlage bearbeiten</DialogTitle>
            <DialogDescription>
              Ändern Sie die Vorlage nach Ihren Wünschen. Variablen werden automatisch erkannt.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateType">Typ der Vorlage</Label>
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="editTypeApp"
                        name="editTemplateType"
                        value="app"
                        checked={selectedTemplate.type === 'app'}
                        onChange={() => setSelectedTemplate({ ...selectedTemplate, type: 'app' })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="editTypeApp" className="font-normal">System-Vorlage (für App-Benachrichtigungen)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="editTypeCustomer"
                        name="editTemplateType"
                        value="customer"
                        checked={selectedTemplate.type === 'customer' || !selectedTemplate.type}
                        onChange={() => setSelectedTemplate({ ...selectedTemplate, type: 'customer' })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="editTypeCustomer" className="font-normal">Kunden-Vorlage (für Kundenkommunikation)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      System-Vorlagen werden für interne App-Benachrichtigungen verwendet, während 
                      Kunden-Vorlagen für die direkte Kommunikation mit Kunden gedacht sind.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editTemplateName">Name der Vorlage</Label>
                  <Input
                    id="editTemplateName"
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editTemplateSubject">Betreff</Label>
                  <Input
                    id="editTemplateSubject"
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editTemplateBody">E-Mail-Inhalt (HTML)</Label>
                  <Textarea
                    id="editTemplateBody"
                    rows={10}
                    value={selectedTemplate.body}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Verwenden Sie {`{{variableName}}`} für dynamische Inhalte, z.B. {`{{kundenname}}`}, {`{{auftragsnummer}}`}, etc.
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
