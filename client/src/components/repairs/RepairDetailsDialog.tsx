import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrintManager } from './PrintOptionsManager';
import { apiRequest } from '@/lib/queryClient';
import { Customer, EmailHistory } from '@shared/schema';
import { Repair } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Erweiterte EmailHistory mit optionalem templateName
export interface EmailHistoryWithTemplate extends EmailHistory {
  templateName?: string;
}
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getStatusBadge } from '@/lib/utils';
import { SignatureDialog } from './SignatureDialog';
import { CustomSignaturePad } from '@/components/ui/signature-pad';
import { useAuth } from '@/hooks/use-auth';
import { DeviceCodeDisplay } from './DeviceCodeDisplay';
import SparePartsList from '@/components/spare-parts/SparePartsList';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Tag,
  AlertCircle,
  Clock,
  Euro,
  FileText,
  User,
  Clipboard,
  Pencil,
  MessageCircle,
  Check,
  X,
  Printer,

  Pen,
  Send,
  QrCode
} from 'lucide-react';

interface RepairDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  onStatusChange?: (id: number, currentStatus: string) => void;
  onEdit?: (id: number) => void;
  mode?: 'normal' | 'dashboard'; // Neuer Modus-Parameter für Dashboard-Ansicht
}

export function RepairDetailsDialog({ open, onClose, repairId, onStatusChange, onEdit, mode = 'normal' }: RepairDetailsDialogProps) {
  console.log('RepairDetailsDialog geöffnet:', open, 'repairId:', repairId);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryWithTemplate[]>([]);
  
  // Auth-Hook für Benutzerinformationen (Preispaket)
  const { user } = useAuth();
  const isProfessionalOrHigher = user?.pricingPlan === 'professional' || user?.pricingPlan === 'enterprise';
  
  // Zwei getrennte Zustände für die Signatur-Dialoge
  const [showDropoffSignatureDialog, setShowDropoffSignatureDialog] = useState(false);
  const [showPickupSignatureDialog, setShowPickupSignatureDialog] = useState(false);
  
  // Für Rückwärtskompatibilität
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const { showPrintOptions } = usePrintManager();
  const { toast } = useToast();
  
  // Dialog schließen mit Verzögerung für Animationen
  const handleClose = () => {
    onClose();
    // Kurze Verzögerung, um Flackern zu vermeiden
    setTimeout(() => {
      setRepair(null);
      setCustomer(null);
    }, 300);
  };
  
  // Daten der Reparatur abrufen
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
    enabled: open && repairId !== null,
  });
  
  // Kundendaten abrufen
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open && repair?.customerId !== undefined,
  });
  
  // E-Mail-Verlauf abrufen
  const { data: emailHistoryData } = useQuery<EmailHistoryWithTemplate[]>({
    queryKey: ['/api/repairs', repairId, 'email-history'],
    queryFn: async () => {
      if (!repairId) {
        console.log('🔍 DEBUG: Keine repairId für E-Mail-Historie');
        return [];
      }
      console.log('🔍 DEBUG: E-Mail-Historie wird abgerufen für repairId:', repairId);
      const response = await apiRequest('GET', `/api/repairs/${repairId}/email-history`);
      const data = await response.json();
      console.log('🔍 DEBUG: E-Mail-Historie-Daten erhalten:', data);
      return data;
    },
    enabled: open && repairId !== null,
  });
  
  // Reparatur und zugehörigen Kunden finden, wenn IDs vorhanden sind
  useEffect(() => {
    if (repairs && repairId) {
      const foundRepair = repairs.find(r => r.id === repairId);
      setRepair(foundRepair || null);
      
      if (foundRepair && customers) {
        const foundCustomer = customers.find(c => c.id === foundRepair.customerId);
        setCustomer(foundCustomer || null);
      }
    }
  }, [repairs, customers, repairId]);
  
  // E-Mail-Verlauf setzen, wenn Daten verfügbar sind
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect für E-Mail-Historie ausgeführt. emailHistoryData:', emailHistoryData);
    if (emailHistoryData) {
      console.log('🔍 DEBUG: E-Mail-Historie wird gesetzt:', emailHistoryData);
      setEmailHistory(emailHistoryData);
    } else {
      console.log('🔍 DEBUG: Keine emailHistoryData vorhanden, Historie wird geleert');
      setEmailHistory([]);
    }
  }, [emailHistoryData]);
  
  // Statustexte konvertieren
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'eingegangen': return 'Eingegangen';
      case 'in_reparatur': return 'In Reparatur';
      case 'ersatzteil_eingetroffen': return 'Ersatzteil eingetroffen';
      case 'ausser_haus': return 'Außer Haus';
      case 'fertig': return 'Fertig';
      case 'abgeholt': return 'Abgeholt';
      default: return status;
    }
  };
  
  // Formatiere das Datum im deutschen Format
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
  };
  
  // Formatiere das Datum und die Uhrzeit für E-Mail-Verlauf
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
  };
  
  if (!repair) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Reparaturauftrag {repair.orderCode || `#${repair.id}`}
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zum Reparaturauftrag und Kundendaten
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Kundendaten */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <User className="h-5 w-5" />
              Kundendaten
            </h3>
            
            {customer ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                  </div>
                </div>
                
                {customer.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>{customer.phone}</div>
                  </div>
                )}
                
                {customer.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>{customer.email}</div>
                  </div>
                )}
                
                {(customer.address || customer.zipCode || customer.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      {customer.address && <div>{customer.address}</div>}
                      {(customer.zipCode || customer.city) && (
                        <div>{customer.zipCode} {customer.city}</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>Kunde seit {formatDate(customer.createdAt.toString())}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground italic">Kundendaten konnten nicht geladen werden</div>
            )}
          </div>
          
          {/* Gerätedaten */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5" />
              Gerätedaten
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium">{repair.brand} {repair.model}</div>
                  <div className="text-sm text-muted-foreground">{repair.deviceType}</div>
                </div>
              </div>
              
              {repair.serialNumber && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Seriennummer</div>
                    <div>{repair.serialNumber}</div>
                  </div>
                </div>
              )}
              
              {repair.deviceCode && (
                <div className="flex items-start gap-2">
                  <Pen className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Gerätecode</div>
                    <DeviceCodeDisplay 
                      repairId={repair.id} 
                      deviceCodeType={repair.deviceCodeType || null} 
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Fehlerbeschreibung</div>
                  <div className="whitespace-pre-wrap">{repair.issue ? repair.issue.split(',').join('\n') : ''}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(repair.status)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Weitere Informationen */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Clipboard className="h-5 w-5" />
              Auftragsinformationen
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Auftragsdatum</div>
                    <div>{formatDate(repair.createdAt.toString())}</div>
                  </div>
                </div>
                
                {repair.estimatedCost && (
                  <div className="flex items-start gap-2">
                    <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Kostenvoranschlag</div>
                      <div className="font-medium">{repair.estimatedCost} €</div>
                    </div>
                  </div>
                )}
                
                {repair.depositAmount && (
                  <div className="flex items-start gap-2">
                    <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Anzahlung</div>
                      <div>{repair.depositAmount} €</div>
                    </div>
                  </div>
                )}
              </div>
              
              {repair.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Notizen</div>
                    <div className="whitespace-pre-wrap">{repair.notes}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Ersatzteile */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <SparePartsList repairId={repair.id} />
          </div>
          
          {/* Unterschriften */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Abgabe-Unterschrift */}
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <Pen className="h-5 w-5" />
                  Unterschrift bei Abgabe
                </h3>
                
                {repair.dropoffSignature ? (
                  <div className="space-y-3">
                    <div className="border rounded bg-white p-2">
                      <img 
                        src={repair.dropoffSignature} 
                        alt="Unterschrift bei Abgabe" 
                        className="max-h-32 mx-auto"
                      />
                    </div>
                    {repair.dropoffSignedAt && (
                      <div className="text-sm text-muted-foreground text-center">
                        Unterschrieben am {formatDateTime(repair.dropoffSignedAt)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-center py-3">
                    Keine Abgabe-Unterschrift vorhanden
                  </div>
                )}
                
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDropoffSignatureDialog(true)}
                    className="flex items-center gap-1"
                  >
                    <Pen className="h-4 w-4" />
                    {repair.dropoffSignature ? 'Unterschrift ändern' : 'Unterschrift hinzufügen'}
                  </Button>
                </div>
              </div>
              
              {/* Abholungs-Unterschrift */}
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <Pen className="h-5 w-5" />
                  Unterschrift bei Abholung
                </h3>
                
                {repair.pickupSignature ? (
                  <div className="space-y-3">
                    <div className="border rounded bg-white p-2">
                      <img 
                        src={repair.pickupSignature} 
                        alt="Unterschrift bei Abholung" 
                        className="max-h-32 mx-auto"
                      />
                    </div>
                    {repair.pickupSignedAt && (
                      <div className="text-sm text-muted-foreground text-center">
                        Unterschrieben am {formatDateTime(repair.pickupSignedAt)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-center py-3">
                    Keine Abholungs-Unterschrift vorhanden
                  </div>
                )}
                
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPickupSignatureDialog(true)}
                    className="flex items-center gap-1"
                    disabled={repair.status !== 'fertig' && repair.status !== 'abgeholt'}
                    title={repair.status !== 'fertig' && repair.status !== 'abgeholt' ? 'Abholungs-Unterschrift ist nur möglich, wenn der Status "Fertig" oder "Abgeholt" ist' : undefined}
                  >
                    <Pen className="h-4 w-4" />
                    {repair.pickupSignature ? 'Unterschrift ändern' : 'Unterschrift hinzufügen'}
                  </Button>
                </div>
              </div>
            </div>
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
                    {entry.status === 'sent' || entry.status === 'success' ? (
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
          {/* Status ändern - nur im normalen Modus anzeigen */}
          {onStatusChange && mode === 'normal' && (
            <Button 
              variant="outline" 
              onClick={() => {
                // Status ändern Dialog öffnen
                if (onStatusChange && repair) {
                  // Zuerst Dialog schließen, dann nach einer kleinen Verzögerung den Status-Dialog öffnen
                  console.log('Schließe Details-Dialog und öffne Status-Dialog für ID:', repair.id);
                  handleClose();
                  // Etwas Verzögerung für die Animation
                  setTimeout(() => {
                    onStatusChange(repair.id, repair.status);
                  }, 300);
                }
              }}
              className="flex items-center gap-1"
            >
              <AlertCircle className="h-4 w-4" />
              Status ändern
            </Button>
          )}
          
          {/* Bearbeiten - nur im normalen Modus anzeigen */}
          {onEdit && mode === 'normal' && (
            <Button 
              variant="outline" 
              onClick={() => {
                // Bearbeiten Dialog öffnen
                if (onEdit && repair) {
                  onEdit(repair.id);
                  handleClose();
                }
              }}
              className="flex items-center gap-1"
            >
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </Button>
          )}

          {/* Drucken - in allen Modi anzeigen */}
          <Button 
            variant="outline" 
            onClick={() => {
              // Druckoptionen anzeigen
              if (repair) {
                handleClose();
                // Verzögerung für die Animation
                setTimeout(() => {
                  showPrintOptions(repair.id);
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
      
      {/* Unterschrift-Dialoge für beide Typen */}
      {/* Dialog für Abgabe-Unterschrift */}
      <SignatureDialog
        open={showDropoffSignatureDialog}
        onClose={() => setShowDropoffSignatureDialog(false)}
        repairId={repairId}
        repair={repair}
        signatureType="dropoff"
      />
      
      {/* Dialog für Abholungs-Unterschrift */}
      <SignatureDialog
        open={showPickupSignatureDialog}
        onClose={() => setShowPickupSignatureDialog(false)}
        repairId={repairId}
        repair={repair}
        signatureType="pickup"
      />
      
      {/* Für Rückwärtskompatibilität */}
      <SignatureDialog
        open={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        repairId={repairId}
        repair={repair}
        signatureType="dropoff" 
      />
    </Dialog>
  );
}