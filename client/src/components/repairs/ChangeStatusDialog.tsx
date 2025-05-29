import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { SubmitHandler } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertCircle, Mail, Star, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';

// Form schema
const statusSchema = z.object({
  status: z.enum(['eingegangen', 'in_reparatur', 'ersatzteil_eingetroffen', 'ausser_haus', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
  sendEmail: z.boolean().optional(),
  technicianNote: z.string().optional()
});

type StatusFormValues = z.infer<typeof statusSchema>;

interface ChangeStatusDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  currentStatus: string;
  onUpdateStatus: (id: number, status: string, sendEmail?: boolean, technicianNote?: string) => void;
}

export function ChangeStatusDialog({ 
  open, 
  onClose, 
  repairId,
  currentStatus,
  onUpdateStatus
}: ChangeStatusDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [smtpInfo, setSmtpInfo] = useState<string | null>(null);
  
  // Abfrage der SMTP-Einstellungen für den Benutzer
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    enabled: open && !!user,
  });

  // SMTP-Infos basierend auf Geschäftseinstellungen ermitteln
  React.useEffect(() => {
    if (businessSettings && businessSettings.smtpUser) {
      // Priorität 1: SMTP-Benutzer aus den Einstellungen
      setSmtpInfo(businessSettings.smtpUser);
    } else if (businessSettings && businessSettings.email) {
      // Priorität 2: E-Mail aus den Geschäftseinstellungen 
      setSmtpInfo(businessSettings.email);
    } else {
      // Fallback
      setSmtpInfo('office@connect7.at');
    }
  }, [businessSettings]);
  
  // Alle Benutzer haben jetzt vollen Zugriff auf alle Funktionen
  const isProfessionalOrHigher = true;
  
  // Form definition
  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: (currentStatus || 'eingegangen') as any,
      sendEmail: false,
      technicianNote: ''
    },
  });
  
  // Zeige E-Mail-Option je nach gewähltem Status
  const currentSelectedStatus = form.watch('status');
  const showEmailOption = currentSelectedStatus === 'fertig' || 
                          currentSelectedStatus === 'ersatzteil_eingetroffen' ||
                          currentSelectedStatus === 'abgeholt';
  
  // Zeige Techniker-Eingabefeld nur bei "Ausser Haus"
  const showTechnicianField = currentSelectedStatus === 'ausser_haus';
  
  // Label für E-Mail-Checkbox je nach Status
  const getEmailLabel = () => {
    if (currentSelectedStatus === 'abgeholt') {
      if (!isProfessionalOrHigher) {
        return (
          <>
            <div className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="h-4 w-4" /> Bewertungsanfragen nur in Professional verfügbar
            </div>
            <p className="text-xs text-amber-500">
              Upgrade auf Professional, um Bewertungsanfragen an Kunden zu senden
            </p>
          </>
        );
      }
      
      return (
        <>
          <FormLabel className="flex items-center gap-1">
            <Star className="h-4 w-4" /> Bewertung anfragen
          </FormLabel>
          <p className="text-sm text-muted-foreground">
            Senden Sie eine Bewertungsanfrage per E-Mail an den Kunden
          </p>
        </>
      );
    }
    
    return (
      <>
        <FormLabel className="flex items-center gap-1">
          <Mail className="h-4 w-4" /> E-Mail senden
        </FormLabel>
        <p className="text-sm text-muted-foreground">
          Benachrichtigen Sie den Kunden per E-Mail über die Statusänderung
        </p>
      </>
    );
  };
  
  // Übersetzungen für StatusBadge-Labels
  const statusLabels: Record<string, string> = {
    eingegangen: 'Eingegangen',
    in_reparatur: 'In Reparatur',
    ersatzteil_eingetroffen: 'Ersatzteil eingetroffen',
    ausser_haus: 'Außer Haus',
    fertig: 'Fertig zur Abholung',
    abgeholt: 'Abgeholt'
  };
  
  // Form submission handler
  const onSubmit: SubmitHandler<StatusFormValues> = (data) => {
    if (!repairId) {
      toast({
        title: 'Fehler',
        description: 'Keine Reparatur ausgewählt.',
        variant: 'destructive',
      });
      return;
    }
    
    onUpdateStatus(repairId, data.status, data.sendEmail, data.technicianNote);
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Status ändern</DialogTitle>
          <DialogDescription>
            Wählen Sie den neuen Status für die Reparatur.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Status auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Techniker-Eingabefeld für "Ausser Haus" Status */}
            {showTechnicianField && (
              <FormField
                control={form.control}
                name="technicianNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Techniker</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Name des Technikers eingeben..."
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Diese Information wird mit Zeitstempel in den Reparaturdetails gespeichert
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Der Hinweis zur deaktivierten automatischen E-Mail-Versendung wurde entfernt */}
            
            {showEmailOption && (
              <div className="space-y-4">
                {currentSelectedStatus === 'abgeholt' && !isProfessionalOrHigher ? (
                  <div className="rounded-md border p-4">
                    {getEmailLabel()}
                  </div>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="sendEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            {getEmailLabel()}
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit">
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}