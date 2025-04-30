import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Customer } from '@shared/schema';
import { Repair } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getStatusBadge } from '@/lib/utils';

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
  X
} from 'lucide-react';

interface RepairDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function RepairDetailsDialog({ open, onClose, repairId }: RepairDetailsDialogProps) {
  const [repair, setRepair] = useState<Repair | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
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
  
  // Dialog schließen
  const handleClose = () => {
    onClose();
    // Kurze Verzögerung, um Flackern zu vermeiden
    setTimeout(() => {
      setRepair(null);
      setCustomer(null);
    }, 300);
  };
  
  if (!repair) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold">
              Reparaturauftrag {repair.orderCode || `#${repair.id}`}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose} 
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Vollständige Informationen zum Reparaturauftrag und Kundendaten
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Kundendaten */}
          <div className="bg-secondary/10 rounded-lg p-4 shadow-sm border">
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
          <div className="bg-secondary/10 rounded-lg p-4 shadow-sm border">
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
                <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Fehlerbeschreibung</div>
                  <div>{repair.issue}</div>
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
          <div className="bg-secondary/10 rounded-lg p-4 shadow-sm border md:col-span-2">
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
        </div>

        <DialogFooter>
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