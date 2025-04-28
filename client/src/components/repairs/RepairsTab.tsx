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
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { Pencil, Printer, Trash2, AlertCircle, Tag, Star, Mail } from 'lucide-react';
import { usePrintManager } from './PrintOptionsManager';

interface RepairsTabProps {
  onNewOrder: () => void;
}

export function RepairsTab({ onNewOrder }: RepairsTabProps) {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSms, setSendSms] = useState(false);
  const [selectedRepairDetails, setSelectedRepairDetails] = useState<Repair | null>(null);
  const { toast } = useToast();
  
  // PrintManager für Druckoptionen
  const { showPrintOptions } = usePrintManager();
  
  // For tracking if we're filtering by today's orders
  const [filterByToday, setFilterByToday] = useState(false);
  
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
  
  // Check for status filter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    
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
    }
  }, [location]);

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
        status: repair.status as 'eingegangen' | 'in_reparatur' | 'fertig' | 'abgeholt' | 'ausser_haus',
        notes: repair.notes,
        createdAt: repair.createdAt.toString(),
        updatedAt: repair.updatedAt.toString(),
        reviewRequestSent: repair.reviewRequestSent || false
      };
      return convertedRepair;
    });
  }, [schemaRepairs]);

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers']
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, sendEmail, sendSms }: { id: number, status: string, sendEmail?: boolean, sendSms?: boolean }) => {
      const response = await apiRequest('PATCH', `/api/repairs/${id}/status`, { status, sendEmail, sendSms });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setShowStatusDialog(false);
    },
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
    },
  });

  const filteredRepairs = useMemo(() => {
    if (!repairs || !customers) return [];

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return repairs
      .filter(repair => {
        // Apply status filter
        if (statusFilter !== 'all' && repair.status !== statusFilter) {
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

  const handleUpdateStatus = () => {
    if (!selectedRepairId || !newStatus) return;
    
    // Status auf "fertig" aktualisieren mit optionalen E-Mail- und SMS-Benachrichtigungen
    if (newStatus === 'fertig') {
      updateStatusMutation.mutate({ 
        id: selectedRepairId, 
        status: newStatus, 
        sendEmail: sendEmail,
        sendSms: sendSms
      });
    }
    // Status auf "abgeholt" aktualisieren, und evtl. Bewertungsanfrage senden
    else if (newStatus === 'abgeholt') {
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
    setSendSms(false); // Reset SMS-Option
    
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

  return (
    <div>
      <div className="flex justify-between items-center p-6">
        <h2 className="text-xl font-semibold">Reparaturübersicht</h2>
        <Button
          onClick={onNewOrder}
          className="bg-white text-primary hover:bg-gray-100 shadow flex items-center gap-2 font-semibold transition-all transform hover:-translate-y-1"
        >
          <span>➕</span> Neuer Auftrag
        </Button>
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
              <SelectItem value="eingegangen">Eingegangen</SelectItem>
              <SelectItem value="in_reparatur">In Reparatur</SelectItem>
              <SelectItem value="ausser_haus">Außer Haus</SelectItem>
              <SelectItem value="fertig">Fertig</SelectItem>
              <SelectItem value="abgeholt">Abgeholt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="px-6 pb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="py-3 px-4 text-left">Nr</th>
                <th className="py-3 px-4 text-left">Kunde</th>
                <th className="py-3 px-4 text-left">Gerät</th>
                <th className="py-3 px-4 text-left">Fehler</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Preis</th>
                <th className="py-3 px-4 text-left">Datum</th>
                <th className="py-3 px-4 text-left">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {repairsLoading || customersLoading ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-500">Lädt Daten...</td>
                </tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-500">Keine Reparaturen gefunden</td>
                </tr>
              ) : (
                filteredRepairs.map(repair => (
                  <tr key={repair.id} className="border-b border-gray-200 hover:bg-blue-50 transition-all">
                    <td className="py-3 px-4">{repair.orderCode || `#${repair.id}`}</td>
                    <td className="py-3 px-4">{repair.customerName}</td>
                    <td className="py-3 px-4">{repair.model}</td>
                    <td className="py-3 px-4">{repair.issue}</td>
                    <td className="py-3 px-4">
                      {getStatusBadge(repair.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {repair.estimatedCost ? `${repair.estimatedCost} €` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(repair.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800 p-1 transform hover:scale-110 transition-all" 
                          title="Status ändern"
                          onClick={() => openStatusDialog(repair.id, repair.status)}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </button>
                        <button 
                          className="text-orange-600 hover:text-orange-800 p-1 transform hover:scale-110 transition-all" 
                          title="Auftrag bearbeiten"
                          onClick={() => {
                            setSelectedRepairId(repair.id);
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <div className="flex gap-1">
                          <button 
                            className="text-gray-600 hover:text-gray-800 p-1 transform hover:scale-110 transition-all" 
                            title="Druckoptionen anzeigen"
                            onClick={() => showPrintOptions(repair.id)}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                        {repair.status === 'abgeholt' && (
                          <button 
                            className="text-yellow-600 hover:text-yellow-800 p-1 transform hover:scale-110 transition-all" 
                            title={repair.reviewRequestSent ? "Bewertungsanfrage erneut senden" : "Bewertungsanfrage senden"}
                            onClick={() => handleSendReviewRequest(repair.id)}
                          >
                            {repair.reviewRequestSent ? 
                              <Star className="h-4 w-4 fill-yellow-500" /> : 
                              <Star className="h-4 w-4" />
                            }
                          </button>
                        )}
                        <button 
                          className="text-red-600 hover:text-red-800 p-1 transform hover:scale-110 transition-all" 
                          title="Auftrag löschen"
                          onClick={() => {
                            setSelectedRepairId(repair.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {/* Summenzeile wurde entfernt und ist nun nur noch im Statistik-Tab verfügbar */}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Status aktualisieren</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Select
              value={newStatus}
              onValueChange={(value) => {
                setNewStatus(value);
                if (value === 'fertig') {
                  setSendEmail(true); // Auto-select email option when status is set to "fertig"
                  setSendSms(true); // Auto-select SMS option when status is set to "fertig"
                } else if (value === 'abgeholt') {
                  setSendEmail(true); // Auto-select review request option when status is set to "abgeholt"
                  setSendSms(false);
                } else {
                  setSendEmail(false);
                  setSendSms(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eingegangen">Eingegangen</SelectItem>
                <SelectItem value="in_reparatur">In Reparatur</SelectItem>
                <SelectItem value="ausser_haus">Außer Haus</SelectItem>
                <SelectItem value="fertig">Fertig / Abholbereit</SelectItem>
                <SelectItem value="abgeholt">Abgeholt</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Benachrichtigungsoptionen für "fertig" Status */}
            {newStatus === 'fertig' && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  <label htmlFor="sendEmail">
                    Benachrichtigungs-E-Mail an Kunden senden
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendSms"
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                  />
                  <label htmlFor="sendSms">
                    SMS-Benachrichtigung an Kunden senden
                  </label>
                </div>
              </div>
            )}
            
            {/* Bewertungsanfrage-Option für "abgeholt" Status */}
            {newStatus === 'abgeholt' && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendReviewRequest"
                    className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  <label htmlFor="sendReviewRequest" className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" /> 
                    Bewertungsanfrage an Kunden senden
                  </label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Aktualisiere...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Repair Dialog */}
      {repairs && selectedRepairId && (
        <EditRepairDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          repair={repairs.find(r => r.id === selectedRepairId) || null}
        />
      )}

      {/* Kein separater Druckdialog mehr nötig, wird durch PrintManager abgedeckt */}
      
      {/* Delete Confirmation Dialog */}
      {selectedRepairId && repairs && (
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => deleteRepairMutation.mutate(selectedRepairId)}
          title="Reparatur löschen"
          description={`Möchten Sie wirklich die Reparatur ${repairs.find(r => r.id === selectedRepairId)?.orderCode || `#${selectedRepairId}`} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          isDeleting={deleteRepairMutation.isPending}
          itemName="Reparatur"
        />
      )}
    </div>
  );
}
