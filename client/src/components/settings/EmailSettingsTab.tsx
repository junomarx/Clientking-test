import React, { useState } from 'react';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Mail, Send } from 'lucide-react';
import { EmailTemplateTab } from './EmailTemplateTab';
import { Separator } from '@/components/ui/separator';

// Schema für die E-Mail-Einstellungen
const emailSettingsSchema = z.object({
  smtpSenderName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.string().optional(),
  testEmailRecipient: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein").optional(),
});

export function EmailSettingsTab() {
  const { settings, isLoading } = useBusinessSettings();
  const { toast } = useToast();
  const [testEmailSent, setTestEmailSent] = useState(false);
  
  // Form Definition mit React Hook Form und Zod Validierung
  const form = useForm<z.infer<typeof emailSettingsSchema>>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpSenderName: "",
      smtpHost: "",
      smtpUser: "",
      smtpPassword: "",
      smtpPort: "",
      testEmailRecipient: "",
    },
  });

  // Aktualisieren der Formularwerte, wenn Einstellungen geladen werden
  React.useEffect(() => {
    if (settings) {
      // Formatierte Einstellungen für das Formular
      const formattedSettings = {
        smtpSenderName: settings.smtpSenderName || "",
        smtpHost: settings.smtpHost || "",
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword || "",
        smtpPort: settings.smtpPort || "",
        testEmailRecipient: "",
      };
      
      form.reset(formattedSettings);
    }
  }, [settings, form]);

  // Mutation für das Update der E-Mail-Einstellungen
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof emailSettingsSchema>) => {
      // Extrahiere testEmailRecipient, da es nicht Teil der Business-Settings ist
      const { testEmailRecipient, ...businessSettings } = data;
      
      const response = await apiRequest("POST", "/api/business-settings", {
        ...settings,
        ...businessSettings
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      toast({
        title: "Erfolg!",
        description: "Die E-Mail-Einstellungen wurden gespeichert.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die E-Mail-Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  // Mutation für das Senden einer Test-E-Mail
  const sendTestEmailMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await apiRequest("POST", "/api/send-test-email", {
        recipient: emailAddress
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test-E-Mail gesendet!",
        description: "Bitte überprüfen Sie Ihren Posteingang.",
        duration: 3000,
      });
      setTestEmailSent(true);
      
      // Nach 5 Sekunden zurücksetzen
      setTimeout(() => setTestEmailSent(false), 5000);
    },
    onError: (error) => {
      toast({
        title: "E-Mail konnte nicht gesendet werden!",
        description: `Fehler: ${error.message}`,
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // Formular absenden
  function onSubmit(data: z.infer<typeof emailSettingsSchema>) {
    updateMutation.mutate(data);
  }

  // Test-E-Mail senden
  function handleSendTestEmail() {
    const emailAddress = form.getValues("testEmailRecipient");
    
    if (!emailAddress) {
      toast({
        title: "Fehler!",
        description: "Bitte geben Sie eine E-Mail-Adresse für die Test-E-Mail ein.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    sendTestEmailMutation.mutate(emailAddress);
  }

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Lade Einstellungen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">E-Mail-Einstellungen</h1>
          <p className="text-gray-500">Konfigurieren Sie Ihre E-Mail-Einstellungen und -Vorlagen</p>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending} 
          variant="default" 
          size="sm" 
          className="flex items-center"
        >
          <Save className="h-4 w-4 mr-2" /> Speichern
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">SMTP-Einstellungen</CardTitle>
              <CardDescription>Konfigurieren Sie Ihren E-Mail-Versand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpSenderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Absendername</FormLabel>
                      <FormControl>
                        <Input placeholder="Handyshop Team" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP-Server</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.beispiel.at" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP-Benutzername</FormLabel>
                      <FormControl>
                        <Input placeholder="user@beispiel.at" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP-Passwort</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP-Port</FormLabel>
                      <FormControl>
                        <Input placeholder="587" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator className="my-4" />
              
              {/* Test-E-Mail senden */}
              <div className="mt-6">
                <h3 className="text-md font-medium mb-2">Test-E-Mail senden</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="testEmailRecipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empfänger-E-Mail</FormLabel>
                          <FormControl>
                            <Input placeholder="test@beispiel.at" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSendTestEmail}
                    disabled={sendTestEmailMutation.isPending || testEmailSent}
                  >
                    {sendTestEmailMutation.isPending ? (
                      <Mail className="h-4 w-4 mr-2 animate-spin" />
                    ) : testEmailSent ? (
                      <Send className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    {testEmailSent ? "Gesendet!" : "Test-E-Mail senden"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Senden Sie eine Test-E-Mail, um Ihre SMTP-Einstellungen zu überprüfen.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* E-Mail-Vorlagen */}
      <div className="mt-8">
        <EmailTemplateTab />
      </div>
    </div>
  );
}