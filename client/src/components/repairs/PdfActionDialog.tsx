import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download, Mail, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Repair, Customer, BusinessSettings } from '@shared/schema';

interface PdfActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repair: Repair;
  customer: Customer;
  businessSettings: BusinessSettings;
  pdfBlob: Blob | null;
}

export function PdfActionDialog({ 
  isOpen, 
  onClose, 
  repair, 
  customer, 
  businessSettings,
  pdfBlob 
}: PdfActionDialogProps) {
  const { toast } = useToast();

  // E-Mail-Versand Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!pdfBlob) throw new Error('PDF nicht verfügbar');
      
      // PDF in Base64 konvertieren
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      const response = await apiRequest('POST', '/api/send-email-with-template', {
        templateName: 'Auftragsbestätigung',
        recipientEmail: customer.email,
        data: {
          customerName: `${customer.firstName} ${customer.lastName}`,
          orderCode: repair.orderCode,
          businessName: businessSettings.businessName || 'Reparaturshop',
          deviceInfo: `${repair.deviceType} ${repair.brand} ${repair.model}`,
          problem: repair.problem,
          estimatedCost: repair.estimatedCost ? `€${repair.estimatedCost}` : 'Auf Anfrage'
        },
        attachments: [{
          filename: `Reparaturauftrag_${repair.orderCode}.pdf`,
          content: base64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }]
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "E-Mail gesendet",
        description: `Reparaturauftrag wurde an ${customer.email} gesendet.`
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "E-Mail-Versand fehlgeschlagen",
        description: error.message || "Fehler beim Senden der E-Mail",
        variant: "destructive"
      });
    }
  });

  const handleDownload = () => {
    if (!pdfBlob) return;
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reparaturauftrag_${repair.orderCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "PDF heruntergeladen",
      description: `Reparaturauftrag ${repair.orderCode} wurde heruntergeladen.`
    });
    onClose();
  };

  const handlePrint = () => {
    if (!pdfBlob) return;
    
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    };
    
    document.body.appendChild(iframe);
    
    toast({
      title: "Druckdialog geöffnet",
      description: "Das PDF wird zum Drucken vorbereitet."
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PDF-Aktionen</DialogTitle>
          <DialogDescription>
            Was möchten Sie mit dem Reparaturauftrag {repair.orderCode} machen?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 h-12"
            variant="outline"
            disabled={!pdfBlob}
          >
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
          
          <Button
            onClick={handleDownload}
            className="flex items-center gap-2 h-12"
            variant="outline"
            disabled={!pdfBlob}
          >
            <Download className="h-4 w-4" />
            Herunterladen
          </Button>
          
          <Button
            onClick={() => sendEmailMutation.mutate()}
            className="flex items-center gap-2 h-12"
            variant="outline"
            disabled={!pdfBlob || !customer.email || sendEmailMutation.isPending}
          >
            {sendEmailMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {customer.email ? `Per E-Mail senden` : 'Keine E-Mail-Adresse'}
          </Button>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}