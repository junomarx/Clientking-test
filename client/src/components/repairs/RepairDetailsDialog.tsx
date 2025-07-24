import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrintManager } from './PrintOptionsManager';
import { apiRequest } from '@/lib/queryClient';
import { Customer, EmailHistory, Repair, RepairStatusHistory } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Erweiterte EmailHistory mit optionalem templateName
export interface EmailHistoryWithTemplate extends EmailHistory {
  templateName?: string;
}

interface StatusHistoryEntry {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  changedAt: string;
  changedByUsername: string | null;
  notes: string | null;
}
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getStatusBadge, getStatusText } from '@/lib/utils/statusBadges';
import { SignatureDialog } from './SignatureDialog';
import { CustomSignaturePad } from '@/components/ui/signature-pad';
import { useAuth } from '@/hooks/use-auth';
import { DeviceCodeDisplay } from './DeviceCodeDisplay';
import { EditDeviceCodeDialog } from './EditDeviceCodeDialog';
import SparePartsList from '@/components/spare-parts/SparePartsList';
import { EditCustomerDialog } from '@/components/customers/EditCustomerDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  History,
  ChevronDown,
  ChevronUp,
  Printer,
  Edit,
  Pen,
  Send,
  QrCode,
  TestTube,
  Plus,
  Save,
  Tablet,
  Laptop,
  Watch,
  Monitor
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showEditDeviceCodeDialog, setShowEditDeviceCodeDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  
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

  // Test-E-Mail-Funktionalität
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  
  // Leihgeräte-Zuordnung
  const [showLoanerDeviceDialog, setShowLoanerDeviceDialog] = useState(false);
  const [assignedLoanerDevice, setAssignedLoanerDevice] = useState<any>(null);
  
  // QueryClient für Cache-Invalidierung
  const queryClient = useQueryClient();

  // Mutation für das Hinzufügen von Notizen
  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      if (!repair?.id) throw new Error("Reparatur-ID fehlt");
      
      // Erstelle formatierte Notiz mit Zeitstempel
      const timestamp = format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de });
      const formattedNote = repair.notes 
        ? `${repair.notes}\n\n[${timestamp}] ${noteText}`
        : `[${timestamp}] ${noteText}`;
      
      const response = await apiRequest('PATCH', `/api/repairs/${repair.id}`, {
        notes: formattedNote
      });
      return response.json();
    },
    onSuccess: (updatedRepair) => {
      toast({
        title: "Notiz hinzugefügt",
        description: "Die Notiz wurde erfolgreich gespeichert.",
      });
      
      // Aktualisiere die lokalen Reparatur-Daten
      setRepair(updatedRepair);
      
      // Invalidiere den Cache
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      
      // Schließe den Dialog und reset das Formular
      setShowAddNoteDialog(false);
      setNewNote('');
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Notiz konnte nicht hinzugefügt werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  const handleSendTestEmail = async () => {
    if (!repair || !customer?.email) {
      toast({
        title: "Fehler",
        description: "Kunde hat keine E-Mail-Adresse hinterlegt",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTestEmail(true);
    try {
      const response = await apiRequest('POST', '/api/send-test-email', {
        repairId: repair.id,
        customerEmail: customer.email
      });

      if (response.ok) {
        toast({
          title: "Test-E-Mail gesendet",
          description: `Auftragsbestätigung wurde an ${customer.email} gesendet`,
        });
      } else {
        throw new Error('Fehler beim Senden der Test-E-Mail');
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Test-E-Mail konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };
  
  // Dialog schließen mit Verzögerung für Animationen
  const handleClose = () => {
    onClose();
    // Kurze Verzögerung, um Flackern zu vermeiden
    setTimeout(() => {
      setRepair(null);
      setCustomer(null);
    }, 300);
  };
  
  // Spezifische Reparatur-Daten abrufen
  const { data: specificRepair, refetch: refetchRepair } = useQuery<Repair>({
    queryKey: [`/api/repairs/${repairId}`],
    enabled: open && repairId !== null,
    staleTime: 0, // Immer frische Daten laden
    cacheTime: 0, // Keine Cache-Zeit
  });

  // Verfügbare Leihgeräte abrufen
  const { data: availableLoanerDevices = [] } = useQuery({
    queryKey: ['/api/loaner-devices/available'],
    enabled: open && repairId !== null,
    staleTime: 0,
  });

  // Zugewiesenes Leihgerät für diese Reparatur abrufen
  const { data: currentLoanerDevice, refetch: refetchLoanerDevice } = useQuery({
    queryKey: [`/api/repairs/${repairId}/loaner-device`],
    enabled: open && repairId !== null,
    staleTime: 0,
  });

  // Mutation für Leihgeräte-Zuweisung
  const assignLoanerMutation = useMutation({
    mutationFn: async ({ repairId, deviceId }: { repairId: number; deviceId: number }) => {
      const response = await apiRequest('POST', `/api/repairs/${repairId}/assign-loaner`, { deviceId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leihgerät zugewiesen",
        description: "Das Leihgerät wurde erfolgreich der Reparatur zugewiesen.",
      });
      setShowLoanerDeviceDialog(false);
      refetchLoanerDevice();
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: `Leihgerät konnte nicht zugewiesen werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation für Leihgeräte-Rückgabe
  const returnLoanerMutation = useMutation({
    mutationFn: async (repairId: number) => {
      const response = await apiRequest('POST', `/api/repairs/${repairId}/return-loaner`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leihgerät zurückgegeben",
        description: "Das Leihgerät wurde erfolgreich zurückgegeben und ist wieder verfügbar.",
      });
      refetchLoanerDevice();
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: `Leihgerät konnte nicht zurückgegeben werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Fallback: Alle Reparaturen abrufen für den Fall, dass spezifische Abfrage fehlschlägt
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
    enabled: open && repairId !== null,
  });
  
  // Kundendaten abrufen
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open && (specificRepair?.customerId || repair?.customerId) !== undefined,
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

  // Status-Verlauf abrufen
  const { data: statusHistoryData, refetch: refetchStatusHistory } = useQuery<StatusHistoryEntry[]>({
    queryKey: ['/api/repairs', repairId, 'status-history'],
    queryFn: async () => {
      if (!repairId) return [];
      console.log('🔍 Status-History abfragen für Reparatur ID:', repairId);
      try {
        const response = await apiRequest('GET', `/api/repairs/${repairId}/status-history`);
        if (!response.ok) {
          console.warn('Status-History konnte nicht abgerufen werden:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('🔍 Status-History-Daten erhalten:', data);
        console.log('🔍 Aktueller Repair-Status aus Repair-Objekt:', repair?.status);
        return data;
      } catch (error) {
        console.error('Fehler beim Abrufen der Status-History:', error);
        return [];
      }
    },
    enabled: open && repairId !== null,
  });
  
  // Reparatur und zugehörigen Kunden finden, wenn IDs vorhanden sind
  useEffect(() => {
    if (repairId) {
      // Verwende spezifische Reparatur-Daten wenn verfügbar, sonst fallback zu repairs array
      const foundRepair = specificRepair || (repairs && repairs.find(r => r.id === repairId));
      console.log('🔍 Gefundene Reparatur:', foundRepair);
      console.log('🔍 Status der gefundenen Reparatur:', foundRepair?.status);
      setRepair(foundRepair || null);
      
      if (foundRepair && customers) {
        const foundCustomer = customers.find(c => c.id === foundRepair.customerId);
        setCustomer(foundCustomer || null);
      }
      
      // Status-History und Reparatur-Daten neu laden wenn sich die Reparatur ändert
      if (foundRepair && repairId) {
        refetchStatusHistory();
        refetchRepair();
      }
    }
  }, [specificRepair, repairs, customers, repairId, refetchStatusHistory, refetchRepair]);
  
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
            Reparaturauftrag {repair.orderCode}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditCustomerDialog(true)}
                className="h-6 w-6 p-0 ml-auto hover:bg-gray-200"
                title="Kundendaten bearbeiten"
              >
                <Edit className="h-4 w-4" />
              </Button>
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
                
                {/* Erstellt von Information für Kunde */}
                {customer.createdBy && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Kunde erstellt von</div>
                      <div className="text-sm font-medium">{customer.createdBy}</div>
                    </div>
                  </div>
                )}
                
                {/* Test-E-Mail Button im Kundendaten-Bereich */}
                {customer.email && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail}
                      className="flex items-center gap-2 w-full"
                    >
                      <TestTube className="h-4 w-4" />
                      {isSendingTestEmail ? 'Sende Auftragsbestätigung...' : 'Test-E-Mail senden'}
                    </Button>
                  </div>
                )}
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
              
              <div className="flex items-start gap-2">
                <Pen className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">Gerätecode</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditDeviceCodeDialog(true)}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                      title="Gerätecode bearbeiten"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  {repair.deviceCode ? (
                    <DeviceCodeDisplay 
                      repairId={repair.id} 
                      deviceCodeType={repair.deviceCodeType || null} 
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Kein Gerätecode gespeichert
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Fehlerbeschreibung</div>
                  <div className="whitespace-pre-wrap">{repair.issue ? repair.issue.split(',').join('\n') : ''}</div>
                </div>
              </div>
              
              {/* Erstellt von Information */}
              {repair.createdBy && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Erstellt von</div>
                    <div className="text-sm font-medium">{repair.createdBy}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStatusHistory(!showStatusHistory)}
                      className="h-6 px-2 text-xs"
                    >
                      <History className="h-3 w-3 mr-1" />
                      Verlauf
                      {showStatusHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                  
                  {/* Aktueller Status */}
                  <div className="flex items-center gap-3 mb-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-pointer">
                            {getStatusBadge(repair.status)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Aktueller Status: {getStatusText(repair.status)}</p>
                          <p>Zuletzt geändert: {format(new Date(repair.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                          <p>Status: {repair.status}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(repair.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </div>
                  
                  {/* Status-Verlauf - ausklappbar */}
                  {showStatusHistory && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Status-Verlauf</div>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                        {statusHistoryData && statusHistoryData.length > 0 ? (
                          statusHistoryData
                            .filter((entry) => entry.newStatus !== repair.status) // Aktuellen Status aus Verlauf ausschließen
                            .map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-2 flex-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-pointer">
                                        {getStatusBadge(entry.newStatus)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Geändert von: {entry.changedByUsername || 'System'}</p>
                                      {entry.notes && <p>Notiz: {entry.notes}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {entry.changedByUsername && (
                                  <span className="text-[9px] text-muted-foreground italic">
                                    von {entry.changedByUsername}
                                  </span>
                                )}
                                {entry.notes && (
                                  <span className="text-[9px] text-muted-foreground ml-1 italic">
                                    ({entry.notes.length > 25 ? entry.notes.substring(0, 25) + '...' : entry.notes})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {format(new Date(entry.changedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">Kein früherer Status verfügbar</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {repair.technicianNote && (
                    <div className="mt-2 text-sm">
                      <div className="text-muted-foreground mb-1">Techniker-Information</div>
                      <div className="whitespace-pre-wrap">{repair.technicianNote}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Weitere Informationen */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Clipboard className="h-5 w-5" />
              Auftragsinformationen
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddNoteDialog(true)}
                className="h-6 w-6 p-0 ml-auto hover:bg-gray-200"
                title="Notiz hinzufügen"
              >
                <Plus className="h-4 w-4" />
              </Button>
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

          {/* Leihgeräte */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Monitor className="h-5 w-5" />
              Leihgeräte
            </h3>
            
            {currentLoanerDevice ? (
              <div className="space-y-3">
                <div className="border rounded bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentLoanerDevice.deviceType === 'smartphone' && <Smartphone className="h-5 w-5" />}
                      {currentLoanerDevice.deviceType === 'tablet' && <Tablet className="h-5 w-5" />}
                      {currentLoanerDevice.deviceType === 'laptop' && <Laptop className="h-5 w-5" />}
                      {currentLoanerDevice.deviceType === 'smartwatch' && <Watch className="h-5 w-5" />}
                      <div>
                        <div className="font-medium">{currentLoanerDevice.brand} {currentLoanerDevice.model}</div>
                        <div className="text-sm text-muted-foreground">
                          {currentLoanerDevice.deviceType === 'smartphone' && 'Smartphone'}
                          {currentLoanerDevice.deviceType === 'tablet' && 'Tablet'}
                          {currentLoanerDevice.deviceType === 'laptop' && 'Laptop'}
                          {currentLoanerDevice.deviceType === 'smartwatch' && 'Smartwatch'}
                          {currentLoanerDevice.imei && ` • IMEI: ${currentLoanerDevice.imei}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Verliehen
                    </Badge>
                  </div>
                  {currentLoanerDevice.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {currentLoanerDevice.notes}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (repair?.id) {
                        returnLoanerMutation.mutate(repair.id);
                      }
                    }}
                    disabled={returnLoanerMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {returnLoanerMutation.isPending ? 'Wird zurückgegeben...' : 'Leihgerät zurückgeben'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-muted-foreground mb-3">
                  Kein Leihgerät zugewiesen
                </div>
                {availableLoanerDevices.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLoanerDeviceDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Leihgerät zuweisen
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Keine verfügbaren Leihgeräte vorhanden
                  </div>
                )}
              </div>
            )}
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
      
      {/* EditCustomerDialog */}
      <EditCustomerDialog
        open={showEditCustomerDialog}
        onClose={() => setShowEditCustomerDialog(false)}
        customer={customer}
      />
      
      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Notiz hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Notiz zur Reparatur hinzu. Die Notiz wird automatisch mit einem Zeitstempel versehen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="note" className="text-sm font-medium">
                Notiz
              </label>
              <Textarea
                id="note"
                placeholder="Beschreiben Sie hier den aktuellen Status, durchgeführte Arbeiten oder wichtige Hinweise..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>
            
            {repair?.notes && (
              <div className="border rounded p-3 bg-gray-50">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Vorhandene Notizen:
                </div>
                <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {repair.notes}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddNoteDialog(false);
                setNewNote('');
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNoteMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {addNoteMutation.isPending ? 'Speichert...' : 'Notiz speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        open={showEditCustomerDialog}
        onOpenChange={setShowEditCustomerDialog}
        customerId={customer?.id || 0}
      />

      {/* Edit Device Code Dialog */}
      {repair && (
        <EditDeviceCodeDialog
          open={showEditDeviceCodeDialog}
          onOpenChange={setShowEditDeviceCodeDialog}
          repairId={repair.id}
          currentCode={repair.deviceCode || undefined}
          currentCodeType={repair.deviceCodeType || undefined}
        />
      )}

      {/* Leihgeräte zuweisen Dialog */}
      <Dialog open={showLoanerDeviceDialog} onOpenChange={setShowLoanerDeviceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leihgerät zuweisen</DialogTitle>
            <DialogDescription>
              Wählen Sie ein verfügbares Leihgerät für diese Reparatur aus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {availableLoanerDevices.length > 0 ? (
              <div className="space-y-3">
                <Label>Verfügbare Leihgeräte</Label>
                <Select onValueChange={(value) => {
                  const deviceId = parseInt(value);
                  if (repair?.id && deviceId) {
                    assignLoanerMutation.mutate({ repairId: repair.id, deviceId });
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Leihgerät auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLoanerDevices.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        <div className="flex items-center gap-2">
                          {device.deviceType === 'smartphone' && <Smartphone className="h-4 w-4" />}
                          {device.deviceType === 'tablet' && <Tablet className="h-4 w-4" />}
                          {device.deviceType === 'laptop' && <Laptop className="h-4 w-4" />}
                          {device.deviceType === 'smartwatch' && <Watch className="h-4 w-4" />}
                          <span className="font-medium">{device.brand} {device.model}</span>
                          {device.imei && <span className="text-xs text-muted-foreground">• {device.imei}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Informationsbereich für ausgewähltes Gerät */}
                <div className="text-sm text-muted-foreground">
                  {availableLoanerDevices.length} verfügbare{availableLoanerDevices.length === 1 ? 's' : ''} Leihgerät{availableLoanerDevices.length === 1 ? '' : 'e'}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Keine verfügbaren Leihgeräte vorhanden
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLoanerDeviceDialog(false)}
            >
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}