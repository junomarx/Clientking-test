import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LayoutTemplate, FileCog, FileText } from 'lucide-react';

const footerSchema = z.object({
  customFooterText: z.string().optional(),
});

type FooterFormValues = z.infer<typeof footerSchema>;

export function CustomFooterTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Laden der aktuellen Fußzeilen-Einstellungen
  const { data: footerSettings, isLoading } = useQuery({
    queryKey: ['/api/business-settings/footer'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/business-settings/footer');
      if (!res.ok) throw new Error('Fehler beim Laden der Fußzeilen-Einstellungen');
      return res.json();
    },
    enabled: !!user,
  });

  const form = useForm<FooterFormValues>({
    resolver: zodResolver(footerSchema),
    defaultValues: {
      customFooterText: footerSettings?.customFooterText || '',
    },
    values: footerSettings,
  });

  // Mutation zum Speichern der Fußzeilen-Einstellungen
  const updateFooterSettingsMutation = useMutation({
    mutationFn: async (data: FooterFormValues) => {
      const res = await apiRequest('PUT', '/api/business-settings/footer', data);
      if (!res.ok) throw new Error('Fehler beim Speichern der Fußzeilen-Einstellungen');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings/footer'] });
      toast({
        title: 'Einstellungen gespeichert',
        description: 'Die Fußzeilen-Einstellungen wurden erfolgreich gespeichert.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Speichern der Einstellungen: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FooterFormValues) => {
    updateFooterSettingsMutation.mutate(values);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Einstellungen werden geladen...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Benutzerdefinierte Fußnoten</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="rounded-lg border p-4 bg-muted/20">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-50 p-3 rounded-md">
                  <LayoutTemplate className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Hinweise zur Fußzeile</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Die Fußzeile erscheint am unteren Rand aller Ausdrucke. Hier können Sie rechtliche Hinweise, 
                    AGB-Ausschnitte oder sonstige wichtige Informationen hinterlegen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="customFooterText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fußzeilentext</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Geben Sie hier Ihren Fußzeilentext ein. Dieser erscheint auf allen Ausdrucken am unteren Rand."
                    className="min-h-[120px]"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Zum Beispiel: "Alle Preise inkl. MwSt. Es gelten unsere AGB. Gerichtsstand ist Wien."
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border p-4 bg-muted/20">
            <div className="flex items-start space-x-4">
              <div className="bg-primary-50 p-3 rounded-md">
                <FileCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Vorschau der Fußzeile</h4>
                <div className="text-sm mt-2 p-3 border rounded-md bg-white">
                  <div className="border-t pt-2 text-xs text-center text-muted-foreground">
                    {form.watch('customFooterText') ?
                      form.watch('customFooterText') :
                      <span className="italic">Keine Fußzeile definiert</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={updateFooterSettingsMutation.isPending}
            className="mt-4"
          >
            {updateFooterSettingsMutation.isPending ? 'Wird gespeichert...' : 'Fußzeile speichern'}
          </Button>
        </form>
      </Form>
    </div>
  );
}