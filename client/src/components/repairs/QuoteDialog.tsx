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
import { Calculator, Mail, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Form schema
const quoteSchema = z.object({
  quotedAmount: z.string().min(1, 'Preis ist erforderlich'),
  quoteDescription: z.string().optional(),
  sendEmail: z.boolean().optional()
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  repairDetails?: {
    customerName?: string;
    orderCode?: string;
    model?: string;
  };
  onSendQuote: (id: number, quotedAmount: string, quoteDescription?: string, sendEmail?: boolean) => void;
}

export function QuoteDialog({ 
  open, 
  onClose, 
  repairId,
  repairDetails,
  onSendQuote
}: QuoteDialogProps) {
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
    if (businessSettings && (businessSettings as any).smtpUser) {
      // Priorität 1: SMTP-Benutzer aus den Einstellungen
      setSmtpInfo((businessSettings as any).smtpUser);
    } else if (businessSettings && (businessSettings as any).email) {
      // Priorität 2: E-Mail-Adresse aus den Einstellungen
      setSmtpInfo((businessSettings as any).email);
    } else {
      // Fallback: Benutzer-E-Mail, falls verfügbar
      if (user && user.email) {
        setSmtpInfo(user.email);
      } else {
        setSmtpInfo(null);
      }
    }
  }, [businessSettings, user]);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quotedAmount: '',
      quoteDescription: '',
      sendEmail: true
    },
  });

  const watchSendEmail = form.watch('sendEmail');

  const handleSubmit: SubmitHandler<QuoteFormValues> = async (data) => {
    if (!repairId) {
      toast({
        title: "Fehler",
        description: "Keine Reparatur-ID angegeben",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSendQuote(repairId, data.quotedAmount, data.quoteDescription, data.sendEmail);
      
      toast({
        title: "Kostenvoranschlag gesendet",
        description: data.sendEmail 
          ? `Kostenvoranschlag wurde erfolgreich per E-Mail an den Kunden gesendet.`
          : `Kostenvoranschlag wurde erstellt.`,
        variant: "default",
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Fehler beim Senden des Kostenvoranschlags:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Senden des Kostenvoranschlags. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Kostenvoranschlag senden
          </DialogTitle>
          <DialogDescription>
            {repairDetails && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600">
                  <div><strong>Auftrag:</strong> {repairDetails.orderCode}</div>
                  <div><strong>Kunde:</strong> {repairDetails.customerName}</div>
                  <div><strong>Gerät:</strong> {repairDetails.model}</div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quotedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preis *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="z.B. 89.90"
                        {...field}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 text-sm">€</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quoteDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optionale Beschreibung der Reparatur..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      E-Mail an Kunde senden
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {watchSendEmail && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle>E-Mail-Versand</AlertTitle>
                <AlertDescription>
                  {smtpInfo ? (
                    <>
                      Der Kostenvoranschlag wird von <strong>{smtpInfo}</strong> gesendet.
                      Der Kunde kann den Kostenvoranschlag direkt über die E-Mail akzeptieren oder ablehnen.
                    </>
                  ) : (
                    <span className="text-amber-600">
                      Keine E-Mail-Einstellungen konfiguriert. Bitte prüfen Sie Ihre SMTP-Einstellungen.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={!repairId}>
                Kostenvoranschlag senden
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}