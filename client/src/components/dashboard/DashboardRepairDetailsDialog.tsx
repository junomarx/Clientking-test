import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/lib/types";
import { statusLabels, formatDateTime } from "@/lib/utils";
import { Printer, MessageCircle, Check, X } from "lucide-react";
import { EmailHistoryWithTemplate } from '@/components/repairs/RepairDetailsDialog';
import { useQuery } from "@tanstack/react-query";

interface SignatureProps {
  signatureData?: string;
  customerName?: string;
  signatureDate?: string;
  signatureType: 'dropoff' | 'pickup';
}

interface DashboardRepairDetailsDialogProps {
  open: boolean;
  repair: any; // Using any for simplicity, adjust based on your application's type
  repairId: number | null;
  customers?: Customer[];
  onClose: () => void;
  onPrint: (repairId: number) => void;
}

// Einfachere Version des Reparaturdetails-Dialogs speziell für das Dashboard
// Ohne Statusänderung, ohne E-Mail-Senden-Funktion
export function DashboardRepairDetailsDialog({
  open,
  repair,
  repairId,
  customers,
  onClose,
  onPrint
}: DashboardRepairDetailsDialogProps) {
  const { data: emailHistory } = useQuery<EmailHistoryWithTemplate[]>({
    queryKey: [`/api/repairs/${repairId}/email-history`],
    enabled: !!repairId,
  });

  const customer = customers?.find(c => c.id === repair?.customerId);

  // Funktionen für Dialog-Aktionen
  const handleClose = () => {
    onClose();
  };

  // Funktion zum Anzeigen einer Signatur mit Erklärungstext
  const SignatureDisplay = ({ signatureData, customerName, signatureDate, signatureType }: SignatureProps) => {
    // Wenn keine Signatur vorhanden ist, zeige eine entsprechende Nachricht an
    if (!signatureData) {
      return (
        <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-md bg-gray-50 h-32">
          <p className="text-muted-foreground text-center">Keine {signatureType === 'dropoff' ? 'Abgabe' : 'Abhol'}-Unterschrift vorhanden</p>
        </div>
      );
    }

    return (
      <div className="border rounded-md p-3 bg-white">
        <div className="h-32 overflow-hidden flex flex-col items-center">
          <img 
            src={signatureData} 
            alt={`${signatureType === 'dropoff' ? 'Abgabe' : 'Abhol'}-Unterschrift`} 
            className="max-h-24 object-contain"
          />
          {customerName && (
            <div className="text-xs text-center mt-2 text-muted-foreground">
              Unterschrift von: {customerName}
              {signatureDate && <span> ({signatureDate})</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!repair) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Reparaturdetails: {repair.orderCode}</span>
            <Badge variant={repair.status === 'fertig' ? 'outline' : 'default'}>
              {statusLabels[repair.status] || repair.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        {/* Reparaturdetails in einem Drei-Spalten-Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gerätedetails */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Gerätedetails</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Gerätetyp:</span>
                <span className="ml-2">
                  {repair.deviceType === 'smartphone' ? 'Smartphone' : 
                   repair.deviceType === 'tablet' ? 'Tablet' : 
                   repair.deviceType === 'laptop' ? 'Laptop' : repair.deviceType}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Hersteller:</span>
                <span className="ml-2">{repair.brand}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Modell:</span>
                <span className="ml-2">{repair.model}</span>
              </div>
              {repair.serialNumber && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Seriennummer:</span>
                  <span className="ml-2">{repair.serialNumber}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Kundendetails */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Kundendetails</h3>
            <div className="space-y-2">
              {customer ? (
                <>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Name:</span>
                    <span className="ml-2">{customer.firstName} {customer.lastName}</span>
                  </div>
                  {customer.email && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">E-Mail:</span>
                      <span className="ml-2">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Telefon:</span>
                      <span className="ml-2">{customer.phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground italic">Kein Kunde zugeordnet</div>
              )}
            </div>
          </div>
          
          {/* Reparaturdetails */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Reparaturdetails</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Problem:</span>
                <span className="ml-2">{repair.issue}</span>
              </div>
              {repair.estimatedCost && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Kostenvoranschlag:</span>
                  <span className="ml-2">{repair.estimatedCost}€</span>
                </div>
              )}
              {repair.depositAmount && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Anzahlung:</span>
                  <span className="ml-2">{repair.depositAmount}€</span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Erstelldatum:</span>
                <span className="ml-2">{formatDateTime(repair.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {/* Notizen zum Auftrag */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Notizen</h3>
            {repair.notes ? (
              <div className="whitespace-pre-wrap">{repair.notes}</div>
            ) : (
              <div className="text-muted-foreground italic">Keine Notizen vorhanden</div>
            )}
          </div>
          
          {/* Abgabe-Unterschrift */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Abgabe-Unterschrift</h3>
            <SignatureDisplay 
              signatureData={repair.dropoffSignature} 
              customerName={customer ? `${customer.firstName} ${customer.lastName}` : undefined}
              signatureDate={repair.dropoffSignatureTimestamp ? formatDateTime(repair.dropoffSignatureTimestamp) : undefined}
              signatureType="dropoff"
            />
          </div>
          
          {/* Abhol-Unterschrift */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium mb-3">Abhol-Unterschrift</h3>
            <SignatureDisplay 
              signatureData={repair.pickupSignature} 
              customerName={customer ? `${customer.firstName} ${customer.lastName}` : undefined}
              signatureDate={repair.pickupSignatureTimestamp ? formatDateTime(repair.pickupSignatureTimestamp) : undefined}
              signatureType="pickup"
            />
          </div>
          
          {/* E-Mail-Verlauf */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5" />
              E-Mail-Verlauf
            </h3>
            
            {emailHistory && emailHistory.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {emailHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-2 p-2 rounded-md bg-white/70 shadow-sm border">
                    {entry.status === 'success' ? (
                      <Check className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 mt-1 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {/* Zeigt den Namen der Vorlage an, wenn verfügbar, sonst den Betreff */}
                        {entry.templateName || entry.subject}
                      </div>
                      <div className="text-xs text-muted-foreground">An: {entry.recipient}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Gesendet: {formatDateTime(entry.sentAt.toString())}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground italic text-center py-3">
                Keine E-Mail-Kommunikation gefunden
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={() => {
              // Druckoptionen anzeigen
              if (repair) {
                handleClose();
                // Verzögerung für die Animation
                setTimeout(() => {
                  onPrint(repair.id);
                }, 300);
              }
            }}
            className="flex items-center gap-1"
          >
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
