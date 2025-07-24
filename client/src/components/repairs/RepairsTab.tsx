import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repair as SchemaRepair, Customer } from '@shared/schema';
import { Repair } from '@/lib/types';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { getStatusBadge } from '@/lib/utils';
import { useLocation } from 'wouter';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { EditRepairDialog } from './EditRepairDialog';
import { RepairDetailsDialog } from './RepairDetailsDialog';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Pencil, 
  Printer, 
  Trash2, 
  AlertCircle, 
  Star, 
  Mail,
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  QrCode,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { usePrintManager } from './PrintOptionsManager';
import { QRSignatureDialog } from '../signature/QRSignatureDialog';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useAuth } from '@/hooks/use-auth';

interface RepairsTabProps {
  onNewOrder: () => void;
  initialFilter?: string;
}

export function RepairsTab({ onNewOrder, initialFilter }: RepairsTabProps) {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState(initialFilter || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRSignatureDialog, setShowQRSignatureDialog] = useState(false);
  const [selectedRepairForSignature, setSelectedRepairForSignature] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  // SMS-Funktionalität wurde entfernt
  const [selectedRepairDetails, setSelectedRepairDetails] = useState<Repair | null>(null);
  const [showLoanerDeviceWarning, setShowLoanerDeviceWarning] = useState(false);
  const [loanerDeviceInfo, setLoanerDeviceInfo] = useState<any>(null);
  const [pendingSignatureRepair, setPendingSignatureRepair] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // PrintManager für Druckoptionen
  const { showPrintOptions } = usePrintManager();
  
  // Business Settings für QR-Code Unterschriften
  const { settings: businessSettings } = useBusinessSettings();
  
  // For tracking if we're filtering by today's orders
  const [filterByToday, setFilterByToday] = useState(false);
  
  // Update search term when initialFilter changes (for QR code filtering)
  useEffect(() => {
    if (initialFilter) {
      setSearchTerm(initialFilter);
    }
  }, [initialFilter]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsPerPageOptions = [10, 20, 50, 100];
  
  // Mutation zum Senden von Bewertungsanfragen
  const sendReviewRequestMutation = useMutation({
    mutationFn: async (repairId: number) => {
      const response = await apiRequest('POST', `/api/repairs/${repairId}/send-review-request`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidiere den Cache, um die aktuellen Daten vom Server zu holen
      // Dies sorgt dafür, dass das reviewRequestSent-Flag im UI angezeigt wird
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      
      toast({
        title: "Erfolgreich",
        description: "Die Bewertungsanfrage wurde erfolgreich gesendet.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Bewertungsanfrage konnte nicht gesendet werden: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Mutation für das Zurückgeben von Leihgeräten
  const returnLoanerDeviceMutation = useMutation({
    mutationFn: async (repairId: number) => {
      const response = await apiRequest('POST', `/api/repairs/${repairId}/return-loaner-device`);
      if (!response.ok) {
        throw new Error('Fehler beim Zurückgeben des Leihgeräts');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
      
      toast({
        title: "Leihgerät zurückgegeben",
        description: "Das Leihgerät wurde erfolgreich zurückgegeben.",
      });
      
      // Jetzt den QR-Code Dialog öffnen
      if (pendingSignatureRepair) {
        setSelectedRepairForSignature(pendingSignatureRepair);
        setShowQRSignatureDialog(true);
        setPendingSignatureRepair(null);
      }
      
      // Warning Dialog schließen
      setShowLoanerDeviceWarning(false);
      setLoanerDeviceInfo(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Check for status filter and email action in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const openEmailParam = params.get('openEmail');
    
    // Verarbeite Status-Parameter
    if (statusParam) {
      if (statusParam === 'today') {
        // Special case for filtering by today's orders
        setFilterByToday(true);
        setStatusFilter('all'); // Reset status filter
      } else {
        setFilterByToday(false);
        setStatusFilter(statusParam);
      }
    } else {
      setFilterByToday(false);
      // Stelle sicher, dass beim direkten Zugriff auf Reparaturen ohne Parameter "all" gesetzt ist
      setStatusFilter('all');
    }
    
    // Zusätzlich: Entferne URL-Parameter nach dem Setzen, damit der Filter zurückgesetzt werden kann
    if (statusParam || openEmailParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Verarbeite openEmail-Parameter
    if (openEmailParam) {
      const repairId = parseInt(openEmailParam);
      if (!isNaN(repairId)) {
        // Status direkt auf Email-Senden setzen
        setSelectedRepairId(repairId);
        setSendEmail(true);
        setShowStatusDialog(true);
        
        // Nach der Verarbeitung den Parameter aus der URL entfernen
        const cleanUrl = window.location.pathname + 
          (statusParam ? `?status=${statusParam}` : '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [location]);

  // Zusätzlicher useEffect, um sicherzustellen, dass der Filter beim Laden der Komponente auf "all" gesetzt wird
  useEffect(() => {
    // Nur setzen, wenn kein URL-Parameter vorhanden ist
    const params = new URLSearchParams(window.location.search);
    if (!params.get('status')) {
      setStatusFilter('all');
    }
  }, []);

  // Hier benutzen wir SchemaRepair für die Anfrage und konvertieren dann zu unserem Repair-Typ
  const { data: schemaRepairs, isLoading: repairsLoading } = useQuery<SchemaRepair[]>({
    queryKey: ['/api/repairs']
  });
  
  // Konvertiere die DB-Repairs zu unserem Repair-Typ mit korrekten deviceType und status
  const repairs = useMemo(() => {
    if (!schemaRepairs) return undefined;
    
    return schemaRepairs.map(repair => {
      // Alle Properties explizit zuweisen, um Typprobleme zu vermeiden
      const convertedRepair: Repair = {
        id: repair.id,
        orderCode: repair.orderCode,
        customerId: repair.customerId,
        deviceType: repair.deviceType as 'smartphone' | 'tablet' | 'laptop',
        brand: repair.brand,
        model: repair.model,
        serialNumber: repair.serialNumber,
        issue: repair.issue,
        estimatedCost: repair.estimatedCost,
        depositAmount: repair.depositAmount,
        status: repair.status as 'eingegangen' | 'in_reparatur' | 'ersatzteil_eingetroffen' | 'fertig' | 'abgeholt' | 'ausser_haus',
        notes: repair.notes,
        createdAt: repair.createdAt.toString(),
        updatedAt: repair.updatedAt.toString(),
        reviewRequestSent: repair.reviewRequestSent || false,
        loanerDeviceId: repair.loanerDeviceId || null
      };
      return convertedRepair;
    });
  }, [schemaRepairs]);

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers']
  });

  // Helper function to get display name for status
  const getStatusDisplayName = (status: string) => {
    switch(status) {
      case 'eingegangen': return 'Eingegangen';
      case 'in_reparatur': return 'In Reparatur';
      case 'ersatzteil_eingetroffen': return 'Ersatzteil eingetroffen';
      case 'fertig': return 'Fertig zur Abholung';
      case 'abgeholt': return 'Abgeholt';
      case 'ausser_haus': return 'Außer Haus';
      default: return status;
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, sendEmail, technicianNote }: { id: number, status: string, sendEmail?: boolean, technicianNote?: string }) => {
      const response = await apiRequest('PATCH', `/api/repairs/${id}/status`, { status, sendEmail, technicianNote });
      const data = await response.json();
      
      // Check for email status in response headers
      const emailSent = response.headers.get('X-Email-Sent') === 'true';
      const emailError = response.headers.get('X-Email-Error');
      
      return { 
        data, 
        emailSent, 
        emailError,
        status,
        automaticEmail: status === 'ersatzteil_eingetroffen' || status === 'fertig'
      };
    },
    onSuccess: (result) => {
      // Sofortiges Cache-Update für alle Repair-Listen
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      
      // Zusätzlich: Cache für die spezifische Reparatur invalidieren falls verwendet
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', result.data.id] });
      
      // E-Mail-Historie auch invalidieren
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', result.data.id, 'email-history'] });
      
      // Erfolgsmeldung anzeigen
      toast({
        title: "Status aktualisiert",
        description: `Status wurde erfolgreich zu "${getStatusDisplayName(result.status)}" geändert.${result.emailSent ? ' E-Mail wurde versendet.' : ''}`,
      });
      
      // E-Mail-Fehler anzeigen falls vorhanden
      if (result.emailError) {
        toast({
          title: "E-Mail-Warnung",
          description: result.emailError,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Status konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  });
  
  // Delete repair mutation
  const deleteRepairMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/repairs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setShowDeleteDialog(false);
      setSelectedRepairId(null);
      toast({
        title: "Erfolg",
        description: "Reparatur wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Reparatur konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  });

  const filteredRepairs = useMemo(() => {
    if (!repairs || !customers) return [];

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return repairs
      .filter(repair => {
        // Apply status filter
        if (statusFilter === 'hide_abgeholt') {
          // "Abgeholt ausblenden" - zeige alle Status außer "abgeholt"
          if (repair.status === 'abgeholt') {
            return false;
          }
        } else if (statusFilter !== 'all' && repair.status !== statusFilter) {
          return false;
        }

        // Apply "today" filter if active
        if (filterByToday) {
          const repairDate = new Date(repair.createdAt);
          repairDate.setHours(0, 0, 0, 0);
          if (repairDate.getTime() !== today.getTime()) {
            return false;
          }
        }

        // Apply search filter
        if (searchTerm) {
          const customer = customers.find(c => c.id === repair.customerId);
          const customerName = customer 
            ? `${customer.firstName} ${customer.lastName}`.toLowerCase() 
            : '';
          
          const searchValue = searchTerm.toLowerCase();
          return (
            (repair.orderCode && repair.orderCode.toLowerCase().includes(searchValue)) ||
            repair.model.toLowerCase().includes(searchValue) ||
            repair.brand.toLowerCase().includes(searchValue) ||
            repair.issue.toLowerCase().includes(searchValue) ||
            customerName.includes(searchValue)
          );
        }

        return true;
      })
      .map(repair => {
        const customer = customers.find(c => c.id === repair.customerId);
        return {
          ...repair,
          customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [repairs, customers, searchTerm, statusFilter, filterByToday]);

  const handleUpdateStatus = async () => {
    if (!selectedRepairId || !newStatus) {
      console.log('Keine Reparatur oder Status ausgewählt');
      return;
    }
    
    console.log(`Status-Update wird ausgeführt: ID=${selectedRepairId}, newStatus=${newStatus}, sendEmail=${sendEmail}`);
    
    // Bei Status "abgeholt" prüfen, ob noch ein Leihgerät zugewiesen ist
    if (newStatus === 'abgeholt') {
      try {
        const response = await apiRequest('GET', `/api/repairs/${selectedRepairId}/loaner-device`);
        if (response.ok) {
          const loanerDevice = await response.json();
          if (loanerDevice) {
            toast({
              title: "Leihgerät nicht zurückgegeben",
              description: `Der Kunde hat noch ein Leihgerät (${loanerDevice.brand} ${loanerDevice.model}). Bitte zuerst das Leihgerät zurückgeben, bevor der Status auf "abgeholt" geändert wird.`,
              variant: "destructive",
            });
            setShowStatusDialog(false);
            return;
          }
        }
      } catch (error) {
        // Wenn API-Fehler (404 = kein Leihgerät), können wir fortfahren
        console.log('Keine Leihgerät-Information verfügbar, Status-Änderung wird fortgesetzt');
      }
      
      updateStatusMutation.mutate({ 
        id: selectedRepairId, 
        status: newStatus
      }, {
        onSuccess: () => {
          // Wenn das Senden der Bewertungsanfrage ausgewählt wurde, diese nach der Statusänderung senden
          if (sendEmail) {
            setTimeout(() => {
              handleSendReviewRequest(selectedRepairId);
            }, 500); // Kleine Verzögerung, damit die Statusänderung zuerst verarbeitet wird
          }
        }
      });
    }
    // Status auf "fertig" aktualisieren mit optionaler E-Mail-Benachrichtigung
    else if (newStatus === 'fertig') {
      updateStatusMutation.mutate({ 
        id: selectedRepairId, 
        status: newStatus, 
        sendEmail: sendEmail
      });
    }
    // Status auf "ersatzteil_eingetroffen" mit E-Mail-Benachrichtigung
    else if (newStatus === 'ersatzteil_eingetroffen') {
      console.log("Status wird auf 'ersatzteil_eingetroffen' gesetzt mit sendEmail:", sendEmail);
      updateStatusMutation.mutate({ 
        id: selectedRepairId, 
        status: newStatus,
        sendEmail: sendEmail
      });
    }
    // Alle anderen Statusänderungen ohne zusätzliche Funktionen
    else {
      updateStatusMutation.mutate({ 
        id: selectedRepairId, 
        status: newStatus
      });
    }
  };

  const openStatusDialog = (id: number, currentStatus: string) => {
    setSelectedRepairId(id);
    setNewStatus(currentStatus);
    setSendEmail(false); // Reset E-Mail-Option
    // SMS-Funktionalität wurde entfernt
    
    // Finde die Reparatur-Details
    const repair = filteredRepairs.find(r => r.id === id);
    if (repair) {
      setSelectedRepairDetails(repair);
    }
    
    setShowStatusDialog(true);
  };
  
  // Funktion zum Senden einer Bewertungsanfrage
  const handleSendReviewRequest = (repairId: number) => {
    sendReviewRequestMutation.mutate(repairId);
  };

  // QR-Code Unterschrift öffnen
  const handleOpenQRSignature = async (repair: any) => {
    // Prüfe bei Status "fertig" IMMER, ob ein Leihgerät zugewiesen ist
    if (repair.status === 'fertig') {
      try {
        // Lade Leihgerät-Informationen über API
        const response = await fetch(`/api/repairs/${repair.id}/loaner-device`);
        if (response.ok) {
          const loanerDevice = await response.json();
          
          // Wenn ein Leihgerät zugewiesen ist, zeige Warning Dialog
          if (loanerDevice) {
            console.log('🚨 LEIHGERÄT GEFUNDEN - Zeige Warning Dialog:', loanerDevice);
            
            // Speichere die Reparatur-Daten für später
            setPendingSignatureRepair({
              id: repair.id,
              customerName: repair.customerName,
              device: `${repair.brand} ${repair.model}`,
              issue: repair.issue,
              status: repair.status,
              estimatedCost: repair.estimatedCost,
              depositAmount: repair.depositAmount,
              customerId: repair.customerId
            });
            
            // Zeige Warning Dialog
            setLoanerDeviceInfo(loanerDevice);
            setShowLoanerDeviceWarning(true);
            return;
          }
        }
      } catch (error) {
        console.log('Keine Leihgerät-Information verfügbar oder 404 - kein Leihgerät zugewiesen');
      }
    }
    
    // Standardverhalten: QR-Code Dialog direkt öffnen (kein Leihgerät oder anderer Status)
    console.log('🟢 KEIN LEIHGERÄT - Öffne QR-Code direkt');
    setSelectedRepairForSignature({
      id: repair.id,
      customerName: repair.customerName,
      device: `${repair.brand} ${repair.model}`,
      issue: repair.issue,
      status: repair.status,
      estimatedCost: repair.estimatedCost,
      depositAmount: repair.depositAmount,
      customerId: repair.customerId
    });
    setShowQRSignatureDialog(true);
  };
  
  // Pagination logic
  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);
  const paginatedRepairs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRepairs.slice(startIndex, endIndex);
  }, [filteredRepairs, currentPage, itemsPerPage]);
  
  // Debug: Log alle Reparaturen mit loanerDeviceId  
  React.useEffect(() => {
    if (paginatedRepairs) {
      console.log('🔍 DEBUG: Alle paginatedRepairs:', paginatedRepairs.length);
      paginatedRepairs.forEach(repair => {
        console.log(`🔍 DEBUG: Repair ${repair.orderCode}:`, {
          id: repair.id,
          loanerDeviceId: repair.loanerDeviceId,
          hasLoanerDeviceId: !!repair.loanerDeviceId
        });
        if (repair.loanerDeviceId) {
          console.log(`✅ Repair ${repair.orderCode} has loanerDeviceId:`, repair.loanerDeviceId);
        }
      });
    }
  }, [paginatedRepairs]);
  
  // Reset pagination when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filterByToday]);
  
  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleFirstPage = () => {
    setCurrentPage(1);
  };
  
  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };
  
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Öffnen des Detailsdialogs
  const openDetailsDialog = (id: number) => {
    setSelectedRepairId(id);
    setShowDetailsDialog(true);
  };
  
  // Schließen des Detailsdialogs
  const closeDetailsDialog = () => {
    setShowDetailsDialog(false);
    setSelectedRepairId(null);
  };

  // Event-Listener für direktes Öffnen des Reparaturdetails-Dialogs
  useEffect(() => {
    const handleOpenDetailsDialog = (event: CustomEvent) => {
      const { repairId } = event.detail;
      if (repairId) {
        console.log('RepairsTab: Öffne Dialog für Reparatur-ID:', repairId);
        openDetailsDialog(repairId);
      }
    };

    // Event-Listener registrieren
    window.addEventListener('open-repair-details-dialog', handleOpenDetailsDialog as EventListener);
    
    // Event-Listener beim Unmount entfernen
    return () => {
      window.removeEventListener('open-repair-details-dialog', handleOpenDetailsDialog as EventListener);
    };
  }, []);

  // Check for selectedRepairId from localStorage when component mounts
  useEffect(() => {
    const storedRepairId = localStorage.getItem('selectedRepairId');
    if (storedRepairId) {
      const repairId = parseInt(storedRepairId, 10);
      if (!isNaN(repairId)) {
        openDetailsDialog(repairId);
        // Clear the stored ID after using it
        localStorage.removeItem('selectedRepairId');
      }
    }
  }, [repairs]); // Depend on repairs being loaded

  return (
    <div>
      <div className="flex justify-between items-center p-6">
        <h2 className="text-xl font-semibold">Reparaturübersicht</h2>
      </div>
      
      <div className="px-6 pb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="hide_abgeholt">Abgeholt ausblenden</SelectItem>
              <SelectItem value="eingegangen">Eingegangen</SelectItem>
              <SelectItem value="in_reparatur">In Reparatur</SelectItem>
              <SelectItem value="ersatzteile_bestellen">Ersatzteile bestellen</SelectItem>
              <SelectItem value="warten_auf_ersatzteile">Warten auf Ersatzteile</SelectItem>
              <SelectItem value="ersatzteil_eingetroffen">Ersatzteil eingetroffen</SelectItem>
              <SelectItem value="ausser_haus">Außer Haus</SelectItem>
              <SelectItem value="fertig">Fertig</SelectItem>
              <SelectItem value="abgeholt">Abgeholt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="px-3 sm:px-6 pb-6">
        {/* Desktop Tabelle (nur auf größeren Bildschirmen anzeigen) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="py-3 px-4 text-left">Nr</th>
                <th className="py-3 px-4 text-left">Kunde</th>
                <th className="py-3 px-4 text-left">Gerät</th>
                <th className="py-3 px-4 text-left">Fehler</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Preis</th>
                <th className="py-3 px-4 text-left">Erstellt von</th>
                <th className="py-3 px-4 text-left">Datum</th>
                <th className="py-3 px-4 text-left">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {repairsLoading || customersLoading ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-gray-500">Lädt Daten...</td>
                </tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-gray-500">Keine Reparaturen gefunden</td>
                </tr>
              ) : (
                paginatedRepairs.map(repair => (
                  <tr 
                    key={repair.id} 
                    className="border-b border-gray-200 hover:bg-blue-50 transition-all cursor-pointer" 
                    onClick={() => openDetailsDialog(repair.id)}
                  >
                    <td className="py-3 px-4">{repair.orderCode || ''}</td>
                    <td className="py-3 px-4">{repair.customerName}</td>
                    <td className="py-3 px-4">{repair.model}</td>
                    <td className="py-3 px-4 whitespace-pre-wrap">{repair.issue ? repair.issue.split(',').join('\n') : ''}</td>
                    <td className="py-3 px-4">
                      {getStatusBadge(repair.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {repair.estimatedCost ? `${repair.estimatedCost} €` : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {repair.createdBy || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(repair.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        {/* Leihgeräte-Indikator */}
                        {repair.loanerDeviceId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-orange-600 p-1">
                                <Smartphone className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Leihgerät ausgegeben</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="text-gray-600 hover:text-gray-800 p-1 transform hover:scale-110 transition-all" 
                              onClick={(e) => {
                                e.stopPropagation();
                                showPrintOptions(repair.id);
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Drucken</p>
                          </TooltipContent>
                        </Tooltip>
                        {repair.status === 'abgeholt' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                className="text-yellow-600 hover:text-yellow-800 p-1 transform hover:scale-110 transition-all" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendReviewRequest(repair.id);
                                }}
                              >
                                {repair.reviewRequestSent ? 
                                 <Star className="h-4 w-4 fill-yellow-500" /> : 
                                  <Star className="h-4 w-4" />
                                }
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{repair.reviewRequestSent ? "Bewertung erneut senden" : "Bewertung senden"}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="text-blue-600 hover:text-blue-800 p-1 transform hover:scale-110 transition-all" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRepairForSignature({
                                  id: repair.id,
                                  customerName: repair.customerName,
                                  device: `${repair.brand} ${repair.model}`,
                                  issue: repair.issue,
                                  status: repair.status,
                                  estimatedCost: repair.estimatedCost,
                                  depositAmount: repair.depositAmount
                                });
                                setShowQRSignatureDialog(true);
                              }}
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>QR-Code Unterschrift</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="text-green-700 hover:text-green-800 p-1 transform hover:scale-110 transition-all" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRepairId(repair.id);
                                setNewStatus(repair.status);
                                setSendEmail(false);
                                setShowStatusDialog(true);
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Status ändern</p>
                          </TooltipContent>
                        </Tooltip>
                        {/* Nur Shop-Owner können löschen, Mitarbeiter nicht */}
                        {user?.role !== 'employee' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                className="text-red-600 hover:text-red-800 p-1 transform hover:scale-110 transition-all" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRepairId(repair.id);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Löschen</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination controls für die Desktop-Ansicht */}
          {filteredRepairs.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Zeige {paginatedRepairs.length} von {filteredRepairs.length} Einträgen
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Einträge pro Seite" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemsPerPageOptions.map(option => (
                      <SelectItem key={option} value={option.toString()}>
                        {option} pro Seite
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleFirstPage}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="mx-2 text-sm">
                  Seite {currentPage} von {totalPages || 1}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleLastPage}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Karten-Ansicht (nur auf kleinen Bildschirmen anzeigen) */}
        <div className="md:hidden space-y-4">
          {repairsLoading || customersLoading ? (
            <div className="py-4 text-center text-gray-500 bg-white rounded-lg shadow-sm">Lädt Daten...</div>
          ) : filteredRepairs.length === 0 ? (
            <div className="py-4 text-center text-gray-500 bg-white rounded-lg shadow-sm">Keine Reparaturen gefunden</div>
          ) : (
            paginatedRepairs.map(repair => (
              <div 
                key={repair.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden cursor-pointer" 
                onClick={() => openDetailsDialog(repair.id)}
              >
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                  <div className="font-medium">{repair.orderCode}</div>
                  <div>{getStatusBadge(repair.status)}</div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-500">Kunde:</div>
                    <div className="font-medium">{repair.customerName}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-500">Gerät:</div>
                    <div>{repair.model}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-500">Problem:</div>
                    <div className="text-right whitespace-pre-wrap">{repair.issue ? repair.issue.split(',').join('\n') : ''}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-500">Preis:</div>
                    <div className="font-medium">{repair.estimatedCost ? `${repair.estimatedCost} €` : '-'}</div>
                  </div>
                  {repair.createdBy && (
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500">Erstellt von:</div>
                      <div className="text-sm">{repair.createdBy}</div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-500">Datum:</div>
                    <div>{new Date(repair.createdAt).toLocaleDateString('de-DE')}</div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 p-3 bg-gray-50 border-t border-gray-100">
                  {/* Leihgeräte-Indikator für mobile Ansicht */}
                  {repair.loanerDeviceId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-orange-600 p-2">
                          <Smartphone className="h-5 w-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Leihgerät ausgegeben</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-white transition-colors" 
                        onClick={(e) => {
                          e.stopPropagation();
                          showPrintOptions(repair.id);
                        }}
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Drucken</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-white transition-colors" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQRSignature(repair);
                        }}
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>QR-Code Unterschrift</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="text-green-700 hover:text-green-800 p-2 rounded-full hover:bg-white transition-colors" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRepairId(repair.id);
                          setNewStatus(repair.status);
                          setSendEmail(false);
                          setShowStatusDialog(true);
                        }}
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status ändern</p>
                    </TooltipContent>
                  </Tooltip>
                  {repair.status === 'abgeholt' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="text-yellow-600 hover:text-yellow-800 p-2 rounded-full hover:bg-white transition-colors" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendReviewRequest(repair.id);
                          }}
                        >
                          {repair.reviewRequestSent ? 
                           <Star className="h-5 w-5 fill-yellow-500" /> : 
                            <Star className="h-5 w-5" />
                          }
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{repair.reviewRequestSent ? "Bewertung erneut senden" : "Bewertung senden"}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="w-9" aria-hidden="true"></div>
                  )}
                  {/* Nur Shop-Owner können löschen, Mitarbeiter nicht */}
                  {user?.role !== 'employee' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-white transition-colors" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRepairId(repair.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Löschen</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Paginierung für die Mobile-Ansicht */}
          {filteredRepairs.length > 0 && (
            <div className="flex flex-col items-center gap-4 py-4 px-2">
              <div className="flex justify-center items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="mx-2 text-sm">
                  Seite {currentPage} von {totalPages || 1}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Einträge pro Seite" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemsPerPageOptions.map(option => (
                      <SelectItem key={option} value={option.toString()}>
                        {option} pro Seite
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-600">
                  {paginatedRepairs.length} von {filteredRepairs.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ChangeStatusDialog für die Statusänderung */}
      {selectedRepairId && (
        <ChangeStatusDialog
          open={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
          repairId={selectedRepairId}
          currentStatus={newStatus || 'eingegangen'}
          onUpdateStatus={(id, status, sendEmail, technicianNote) => {
            console.log(`Status-Update für ID=${id}, newStatus=${status}, sendEmail=${sendEmail}, technicianNote=${technicianNote}`);
            
            if (status === 'abgeholt') {
              updateStatusMutation.mutate({
                id: id,
                status: status,
                technicianNote: technicianNote
              }, {
                onSuccess: () => {
                  // Wenn das Senden der Bewertungsanfrage ausgewählt wurde, diese nach der Statusänderung senden
                  if (sendEmail) {
                    setTimeout(() => {
                      handleSendReviewRequest(id);
                    }, 500);
                  }
                }
              });
            } else {
              updateStatusMutation.mutate({
                id: id,
                status: status,
                sendEmail: sendEmail,
                technicianNote: technicianNote
              });
            }
            
            setShowStatusDialog(false);
          }}
        />
      )}

      {/* Edit Repair Dialog */}
      {repairs && selectedRepairId && (
        <EditRepairDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          repair={repairs.find(r => r.id === selectedRepairId) || null}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {selectedRepairId && repairs && (
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => deleteRepairMutation.mutate(selectedRepairId)}
          title="Reparatur löschen"
          description={`Möchten Sie wirklich die Reparatur ${repairs.find(r => r.id === selectedRepairId)?.orderCode} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          isDeleting={deleteRepairMutation.isPending}
          itemName="Reparatur"
        />
      )}

      {/* Repair Details Dialog */}
      <RepairDetailsDialog
        open={showDetailsDialog && !showEditDialog}
        onClose={closeDetailsDialog}
        repairId={selectedRepairId}
        onStatusChange={openStatusDialog}
        onEdit={(id) => {
          // Zuerst Dialog schließen, dann nach einer kleinen Verzögerung den Edit-Dialog öffnen
          console.log('Schließe Details-Dialog und öffne Edit-Dialog für ID:', id);
          setShowDetailsDialog(false);
          // Etwas längere Verzögerung für die Animation
          setTimeout(() => {
            setSelectedRepairId(id);
            setShowEditDialog(true);
          }, 300);
        }}
      />

      {/* QR Signature Dialog */}
      {selectedRepairForSignature && businessSettings && (
        <QRSignatureDialog
          open={showQRSignatureDialog}
          onOpenChange={setShowQRSignatureDialog}
          repair={selectedRepairForSignature}
          businessName={businessSettings.businessName}
        />
      )}

      {/* Leihgerät Warning Dialog */}
      <Dialog open={showLoanerDeviceWarning} onOpenChange={setShowLoanerDeviceWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Leihgerät noch nicht zurückgegeben
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Der Kunde hat noch ein Leihgerät, das zurückgegeben werden muss bevor der Auftrag als abgeholt markiert werden kann.
            </div>
            
            {loanerDeviceInfo && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="font-medium text-sm">
                  {loanerDeviceInfo.brand} {loanerDeviceInfo.model}
                </div>
                <div className="text-xs text-muted-foreground">
                  {loanerDeviceInfo.deviceType === 'smartphone' && 'Smartphone'}
                  {loanerDeviceInfo.deviceType === 'tablet' && 'Tablet'}
                  {loanerDeviceInfo.deviceType === 'laptop' && 'Laptop'}
                  {loanerDeviceInfo.deviceType === 'smartwatch' && 'Smartwatch'}
                  {loanerDeviceInfo.imei && ` • IMEI: ${loanerDeviceInfo.imei}`}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLoanerDeviceWarning(false);
                setLoanerDeviceInfo(null);
                setPendingSignatureRepair(null);
              }}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                if (pendingSignatureRepair) {
                  returnLoanerDeviceMutation.mutate(pendingSignatureRepair.id);
                }
              }}
              disabled={returnLoanerDeviceMutation.isPending}
            >
              {returnLoanerDeviceMutation.isPending ? 'Wird zurückgegeben...' : 'Leihgerät zurückgegeben'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
