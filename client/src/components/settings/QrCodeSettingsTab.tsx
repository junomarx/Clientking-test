import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { isProfessionalOrHigher } from '@/lib/utils';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode } from 'lucide-react';

const qrCodeSchema = z.object({
  qrCodeEnabled: z.boolean().default(false),
  qrCodeType: z.string().default('repair_status'),
  qrCodeContent: z.string().optional(),
});

type QrCodeFormValues = z.infer<typeof qrCodeSchema>;

export function QrCodeSettingsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // QR-Code-Typen
  const qrCodeTypes = [
    { id: 'repair_status', name: 'Reparaturstatus-Abfrage' },
    { id: 'review', name: 'Bewertungslink' },
    { id: 'website', name: 'Eigene Webseite' },
    { id: 'custom', name: 'Benutzerdefinierter Link' },
  ];

  // Laden der aktuellen QR-Code-Einstellungen
  const { data: qrCodeSettings, isLoading } = useQuery({
    queryKey: ['/api/business-settings/qr-code'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/business-settings/qr-code');
      if (!res.ok) throw new Error('Fehler beim Laden der QR-Code-Einstellungen');
      return res.json();
    },
    enabled: !!user,
  });

  const form = useForm<QrCodeFormValues>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: {
      qrCodeEnabled: false,
      qrCodeType: 'repair_status',
      qrCodeContent: '',
    }
  });
  
  // Aktualisiere Formularwerte, wenn Daten geladen werden
  React.useEffect(() => {
    if (qrCodeSettings) {
      console.log('Setze Formularwerte mit Daten:', qrCodeSettings);
      form.reset({
        qrCodeEnabled: qrCodeSettings.qrCodeEnabled || false,
        qrCodeType: qrCodeSettings.qrCodeType || 'repair_status',
        qrCodeContent: qrCodeSettings.qrCodeContent || '',
      });
    }
  }, [qrCodeSettings, form]);

  // Aktueller QR-Code-Typ als reaktiver Wert
  const qrCodeType = form.watch('qrCodeType');
  const qrCodeEnabled = form.watch('qrCodeEnabled');

  // Mutation zum Speichern der QR-Code-Einstellungen
  const updateQrCodeSettingsMutation = useMutation({
    mutationFn: async (data: QrCodeFormValues) => {
      console.log('Speichere QR-Code-Einstellungen:', data);
      const res = await apiRequest('PUT', '/api/business-settings/qr-code', data);
      
      // Debug-Ausgabe der Response
      console.log('PUT Response Status:', res.status, res.statusText);
      
      if (!res.ok) {
        // Fehlermeldung aus der Antwort extrahieren
        let errorMessage = 'Fehler beim Speichern der QR-Code-Einstellungen';
        try {
          const errorData = await res.json();
          console.error('Server Error:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Fehler beim Parsen der Fehlerantwort:', e);
        }
        throw new Error(errorMessage);
      }
      
      const responseData = await res.json();
      console.log('Erfolgreich gespeichert:', responseData);
      return responseData;
    },
    onSuccess: (data) => {
      console.log('Mutation erfolgreich, Daten:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings/qr-code'] });
      toast({
        title: 'Einstellungen gespeichert',
        description: 'Die QR-Code-Einstellungen wurden erfolgreich gespeichert.',
      });
    },
    onError: (error) => {
      console.error('Mutation fehlgeschlagen:', error);
      toast({
        title: 'Fehler',
        description: `Fehler beim Speichern der Einstellungen: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: QrCodeFormValues) => {
    updateQrCodeSettingsMutation.mutate(values);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Einstellungen werden geladen...</div>;
  }

  // Prüfen, ob der Benutzer das Professional- oder Enterprise-Paket hat
  const isProfessional = isProfessionalOrHigher(user);

  // Wenn der Benutzer nicht Professional oder höher ist, zeige einen Hinweis an
  if (!isProfessional) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">QR-Code-Einstellungen</h3>
        
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-medium text-amber-800">Funktion nicht verfügbar</h4>
          <p className="mt-2 text-sm text-amber-700">
            QR-Codes sind nur im Professional- und Enterprise-Paket verfügbar. 
            Bitte upgraden Sie Ihr Paket, um diese Funktion nutzen zu können.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">QR-Code-Einstellungen</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="qrCodeEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>QR-Codes aktivieren</FormLabel>
                  <FormDescription>
                    Aktivieren Sie QR-Codes auf Ihren Ausdrucken für schnellen Zugriff auf Informationen.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {qrCodeEnabled && (
            <>
              <FormField
                control={form.control}
                name="qrCodeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QR-Code-Typ</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="QR-Code-Typ auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {qrCodeTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Wählen Sie, wohin der QR-Code Ihre Kunden führen soll.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(qrCodeType === 'custom' || qrCodeType === 'website') && (
                <FormField
                  control={form.control}
                  name="qrCodeContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benutzerdefinierte URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Geben Sie die vollständige URL ein, zu der der QR-Code führen soll.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {qrCodeType === 'repair_status' && (
                <div className="rounded-lg border p-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-50 p-3 rounded-md">
                      <QrCode className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Reparaturstatus-Abfrage</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mit diesem QR-Code können Kunden den aktuellen Status ihrer Reparatur abfragen, 
                        indem sie einfach den Code scannen. Die URL wird automatisch generiert.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {qrCodeType === 'review' && (
                <div className="rounded-lg border p-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-50 p-3 rounded-md">
                      <QrCode className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Bewertungslink</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Dieser QR-Code führt Kunden zu Ihrem in den Einstellungen hinterlegten Bewertungslink. 
                        Stellen Sie sicher, dass Sie einen Bewertungslink in den Geschäftseinstellungen konfiguriert haben.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <Button 
            type="submit" 
            disabled={updateQrCodeSettingsMutation.isPending}
            className="mt-4"
          >
            {updateQrCodeSettingsMutation.isPending ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </Button>
        </form>
      </Form>
    </div>
  );
}