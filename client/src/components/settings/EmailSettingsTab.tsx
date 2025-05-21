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
import { Save, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmailTemplateTab } from './EmailTemplateTab';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SmtpTestDialog } from '../admin/SmtpTestDialog';
import { UserSmtpTestDialog } from './UserSmtpTestDialog';

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
  const [smtpTestDialogOpen, setSmtpTestDialogOpen] = useState(false);
  
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

  // Formular absenden
  function onSubmit(data: z.infer<typeof emailSettingsSchema>) {
    updateMutation.mutate(data);
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
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">E-Mail-Einstellungen</h1>
          <p className="text-sm text-gray-500">Konfigurieren Sie Ihre E-Mail-Einstellungen</p>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending} 
          variant="default" 
          size="sm" 
          className="flex items-center h-8 text-xs px-3"
        >
          <Save className="h-3 w-3 mr-1" /> Speichern
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">SMTP-Einstellungen</CardTitle>
              <CardDescription className="text-xs md:text-sm">Konfigurieren Sie Ihren E-Mail-Versand</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3 space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpSenderName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Absendername</FormLabel>
                      <FormControl>
                        <Input placeholder="Handyshop Team" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">SMTP-Server</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.beispiel.at" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpUser"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">SMTP-Benutzername</FormLabel>
                      <FormControl>
                        <Input placeholder="user@beispiel.at" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPassword"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">SMTP-Passwort</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">SMTP-Port</FormLabel>
                      <FormControl>
                        <Input placeholder="587" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator className="my-4" />
              
              {/* Test-E-Mail senden */}
              <div className="mt-4 md:mt-6">
                <h3 className="text-sm md:text-md font-medium mb-2">Test-E-Mail senden</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-end">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="testEmailRecipient"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-sm">Empfänger-E-Mail</FormLabel>
                          <FormControl>
                            <Input placeholder="test@beispiel.at" {...field} className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 text-xs w-full"
                      onClick={() => setSmtpTestDialogOpen(true)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      SMTP-Test
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Testen Sie Ihre SMTP-Einstellungen mit vollständiger Kontrolle über alle Parameter.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* E-Mail-Vorlagen */}
      <div className="mt-6 md:mt-8">
        <EmailTemplateTab />
      </div>
      
      {/* SMTP-Test-Dialog */}
      <UserSmtpTestDialog
        open={smtpTestDialogOpen}
        onClose={() => {
          // Wenn der Dialog geschlossen wird, aktualisieren wir die Geschäftseinstellungen
          // Dies stellt sicher, dass die UI aktualisiert wird, wenn SMTP-Test-Einstellungen
          // automatisch gespeichert wurden
          queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
          setSmtpTestDialogOpen(false);
        }}
        initialSettings={{
          host: form.getValues("smtpHost") || '',
          port: form.getValues("smtpPort") || '587',
          user: form.getValues("smtpUser") || '',
          password: form.getValues("smtpPassword") || '',
          sender: form.getValues("smtpSenderName") || 'Handyshop Verwaltung',
          recipient: form.getValues("testEmailRecipient") || '',
        }}
      />
    </div>
  );
}