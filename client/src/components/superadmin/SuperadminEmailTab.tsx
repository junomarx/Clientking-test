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

interface SuperadminEmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSenderName: string;
  smtpSenderEmail: string;
  isActive: boolean;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
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
  
  // States für SMTP-Einstellungen (konsolidiert)
  const [emailSettings, setEmailSettings] = useState<GlobalEmailSettings>({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpSenderName: 'Handyshop Verwaltung',
    smtpSenderEmail: 'noreply@phonerepair.at'
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
  
  // Aktiver Tab für E-Mail-Vorlagentypen (app oder customer)
  const [templateType, setTemplateType] = useState<'app' | 'customer'>('app');
  
  // States für den Vorlagen-Test
  const [templateTestDialogOpen, setTemplateTestDialogOpen] = useState(false);
  const [templateToTest, setTemplateToTest] = useState<EmailTemplate | null>(null);
  const [templateTestEmail, setTemplateTestEmail] = useState('');
  
  // Radiobutton-Style für konsistente Darstellung
  const radioStyle = "w-4 h-4 border border-gray-300 bg-background text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  
  // SMTP-Konfiguration abrufen (konsolidiertes System)
  const { data: smtpConfig, isLoading: isLoadingConfig } = useQuery<GlobalEmailSettings>({
    queryKey: ['/api/superadmin/email/config']
  });
  
  // Callback für SMTP-Konfiguration
  useEffect(() => {
    if (smtpConfig) {
      setEmailSettings(smtpConfig);
    }
  }, [smtpConfig]);
  
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

  // E-Mail-Vorlagen abrufen mit Typ-Filter
  const { data: emailTemplates, isLoading: isLoadingTemplates, error: templatesError, refetch: refetchTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/superadmin/email/templates', templateType],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/superadmin/email/templates?type=${templateType}`);
      return await response.json();
    }
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
  
  // Superadmin-SMTP-Konfiguration speichern
  const saveSuperadminSmtpConfigMutation = useMutation({
    mutationFn: async (config: SuperadminEmailSettings) => {
      const response = await apiRequest('POST', '/api/superadmin/email/superadmin-config', config);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email/superadmin-config'] });
      toast({
        title: 'Superadmin-SMTP-Konfiguration gespeichert',
        description: 'Die Superadmin-E-Mail-Einstellungen wurden erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Speichern der Superadmin-Einstellungen',
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
  
  // SMTP-Test-E-Mail senden
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
  
  // Superadmin-SMTP-Test-E-Mail senden
  const sendSuperadminTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/superadmin/email/superadmin-test', { email });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Superadmin Test-E-Mail gesendet',
        description: 'Die Test-E-Mail über den Superadmin-SMTP-Server wurde erfolgreich versendet.'
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden der Superadmin-Test-E-Mail',
        description: error.message
      });
    }
  });
  
  // Vorlage-Test-E-Mail senden
  const sendTemplateTestEmailMutation = useMutation({
    mutationFn: async (data: { templateId: number, testEmail: string }) => {
      const response = await apiRequest('POST', '/api/superadmin/email/template-test', data);
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Vorlagen-Test-E-Mail gesendet',
        description: `Die Test-E-Mail wurde erfolgreich an ${variables.testEmail} versendet.`
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Senden der Vorlagen-Test-E-Mail',
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
    // Verwende die E-Mail-Adresse aus dem Dialog
    if (templateTestEmail) {
      sendTestEmailMutation.mutate(templateTestEmail);
    } else {
      toast({
        variant: 'destructive',
        title: 'Keine E-Mail-Adresse',
        description: 'Bitte geben Sie eine E-Mail-Adresse ein.'
      });
    }
  };
  
  // Superadmin Test-E-Mail senden
  const handleSendSuperadminTestEmail = () => {
    // Verwende die E-Mail-Adresse aus dem Dialog
    if (templateTestEmail) {
      sendSuperadminTestEmailMutation.mutate(templateTestEmail);
    } else {
      toast({
        variant: 'destructive',
        title: 'Keine E-Mail-Adresse',
        description: 'Bitte geben Sie eine E-Mail-Adresse ein.'
      });
    }
  };
  
  // SMTP-Konfiguration speichern (Überarbeitet)
  const handleSaveSuperadminSmtpConfig = () => {
    saveSmtpConfigMutation.mutate(emailSettings);
  };
  
  // Vorlage zum Testen auswählen und Dialog öffnen
  const handleSendTemplateTestEmail = (template: EmailTemplate) => {
    setTemplateToTest(template);
    setTemplateTestEmail('');
    setTemplateTestDialogOpen(true);
  };
  
  // Test-E-Mail mit ausgewählter Vorlage senden
  const handleSendTemplateTest = () => {
    if (templateToTest && templateTestEmail) {
      sendTemplateTestEmailMutation.mutate({
        templateId: templateToTest.id,
        testEmail: templateTestEmail
      });
      setTemplateTestDialogOpen(false);
      setTemplateToTest(null);
      setTemplateTestEmail('');
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
        variables: selectedTemplate.variables,
        type: selectedTemplate.type || 'customer' // Stelle sicher, dass der Typ übermittelt wird
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
          <TabsTrigger value="smtp">SMTP-Konfiguration</TabsTrigger>
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
                Diese Einstellungen werden für <strong>alle E-Mails</strong> verwendet, die vom System versendet werden, 
                einschließlich systemrelevanter E-Mails wie Passwort-Zurücksetzungen und Benutzerbenachrichtigungen.
                Benutzer können in ihren Einstellungen auch eigene SMTP-Server für ihre Shop-E-Mails konfigurieren.
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
        
        {/* Superadmin SMTP Tab wurde entfernt und mit dem globalen SMTP Tab zusammengeführt */}
        
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
              {/* Vorlagetypen-Tabs */}
              <Tabs defaultValue={templateType} className="mt-4" onValueChange={(value) => setTemplateType(value as 'app' | 'customer')}>
                <TabsList>
                  <TabsTrigger value="app">System-Vorlagen</TabsTrigger>
                  <TabsTrigger value="customer">Kunden-Vorlagen</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Vorlagentabelle */}
              <div className="mt-4">
                {isLoadingTemplates ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : emailTemplates && emailTemplates.length > 0 ? (
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
                        .filter(template => templateType === 'app' ? 
                          (!template.type || template.type === 'app') : 
                          template.type === 'customer'
                        )
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
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Test-E-Mail mit dieser Vorlage senden"
                                  onClick={() => {
                                    setTemplateToTest(template);
                                    setTemplateTestEmail('');
                                    setTemplateTestDialogOpen(true);
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Vorlage bearbeiten"
                                  onClick={() => handleEditTemplate(template)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  title="Vorlage löschen"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      {emailTemplates.filter(template => templateType === 'app' ? 
                        (!template.type || template.type === 'app') : 
                        template.type === 'customer'
                      ).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Keine {templateType === 'app' ? 'System' : 'Kunden'}-Vorlagen gefunden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Keine {templateType === 'app' ? 'System' : 'Kunden'}-Vorlagen gefunden.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog zum Erstellen einer neuen Vorlage */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Neue E-Mail-Vorlage erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue E-Mail-Vorlage für das System. Diese Vorlage wird allen Benutzern zur Verfügung stehen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="templateName" className="text-right">
                Vorlagenname
              </Label>
              <Input
                id="templateName"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="templateSubject" className="text-right">
                Betreff
              </Label>
              <Input
                id="templateSubject"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="templateBody" className="text-right pt-2">
                Inhalt
              </Label>
              <Textarea
                id="templateBody"
                value={newTemplate.body}
                onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                className="col-span-3 min-h-[250px]"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newTemplateType" className="text-right">Typ</Label>
              <div className="col-span-3">
                <select
                  id="newTemplateType"
                  value={newTemplate.type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value as 'app' | 'customer' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="app">System-Vorlage</option>
                  <option value="customer">Kunden-Vorlage</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Erkannte Variablen
              </Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {newTemplate.variables.length > 0 ? (
                  newTemplate.variables.map((variable, index) => (
                    <Badge key={index} variant="outline">{variable}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Keine Variablen erkannt</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending || !newTemplate.name || !newTemplate.subject || !newTemplate.body}
            >
              {createTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Vorlage erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Bearbeiten einer Vorlage */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>E-Mail-Vorlage bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die ausgewählte E-Mail-Vorlage.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTemplateName" className="text-right">
                  Vorlagenname
                </Label>
                <Input
                  id="editTemplateName"
                  value={selectedTemplate.name}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTemplateSubject" className="text-right">
                  Betreff
                </Label>
                <Input
                  id="editTemplateSubject"
                  value={selectedTemplate.subject}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="editTemplateBody" className="text-right pt-2">
                  Inhalt
                </Label>
                <Textarea
                  id="editTemplateBody"
                  value={selectedTemplate.body}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                  className="col-span-3 min-h-[250px]"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTemplateType" className="text-right">Typ</Label>
                <div className="col-span-3">
                  <select
                    id="editTemplateType"
                    value={selectedTemplate.type}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, type: e.target.value as 'app' | 'customer' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="app">System-Vorlage</option>
                    <option value="customer">Kunden-Vorlage</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Erkannte Variablen
                </Label>
                <div className="col-span-3 flex flex-wrap gap-2">
                  {selectedTemplate.variables.length > 0 ? (
                    selectedTemplate.variables.map((variable, index) => (
                      <Badge key={index} variant="outline">{variable}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Keine Variablen erkannt</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleUpdateTemplate}
              disabled={updateTemplateMutation.isPending || !selectedTemplate?.name || !selectedTemplate?.subject || !selectedTemplate?.body}
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
      
      {/* Dialog für Vorlage-Test-E-Mail */}
      <Dialog open={templateTestDialogOpen} onOpenChange={setTemplateTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test-E-Mail mit Vorlage senden</DialogTitle>
            <DialogDescription>
              Geben Sie eine E-Mail-Adresse ein, an die eine Test-E-Mail mit der Vorlage "{templateToTest?.name}" gesendet werden soll.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">E-Mail-Adresse</Label>
              <Input
                id="test-email"
                placeholder="example@example.com"
                value={templateTestEmail}
                onChange={(e) => setTemplateTestEmail(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateTestDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSendTemplateTest} disabled={!templateTestEmail || sendTemplateTestEmailMutation.isPending}>
              {sendTemplateTestEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Senden...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Test-E-Mail senden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}