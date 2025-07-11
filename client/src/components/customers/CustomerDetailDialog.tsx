import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Customer as SchemaCustomer, InsertCustomer, Repair, CostEstimate } from '@shared/schema';
import { Customer } from '@/lib/types';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Loader2, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  Pencil, 
  Trash2, 
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  Euro,
  Tag,
  Clock,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { EditCustomerDialog } from './EditCustomerDialog';
import { NewCostEstimateDialog } from '@/components/cost-estimates/NewCostEstimateDialog';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getStatusBadge } from '@/lib/utils';

interface CustomerDetailDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: number | null;
  onNewOrder?: (customerId: number) => void;
}

// Helper function to format date
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
};

export function CustomerDetailDialog({ open, onClose, customerId, onNewOrder }: CustomerDetailDialogProps) {
  const [showRepairs, setShowRepairs] = useState(false);
  const [showCostEstimates, setShowCostEstimates] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewRepairDialog, setShowNewRepairDialog] = useState(false);
  const [showNewCostEstimateDialog, setShowNewCostEstimateDialog] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Load customer details
  const { 
    data: customer, 
    isLoading: isLoadingCustomer 
  } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: !!customerId && open,
  });
  
  // Load customer repairs
  const { 
    data: repairs, 
    isLoading: isLoadingRepairs 
  } = useQuery<Repair[]>({
    queryKey: [`/api/customers/${customerId}/repairs`],
    enabled: !!customerId && open,
  });

  // Load customer cost estimates - using the general endpoint and filtering
  const { 
    data: allCostEstimates, 
    isLoading: isLoadingCostEstimates 
  } = useQuery<CostEstimate[]>({
    queryKey: ['/api/cost-estimates'],
    enabled: !!customerId && open,
  });

  // Filter cost estimates for this customer
  const costEstimates = allCostEstimates?.filter(estimate => estimate.customerId === customerId) || [];

  const handleEditCustomer = () => {
    setShowEditDialog(true);
  };

  const handleNewRepair = () => {
    if (customerId && onNewOrder) {
      onNewOrder(customerId);
      onClose();
    }
  };

  const handleNewCostEstimate = () => {
    setShowNewCostEstimateDialog(true);
  };

  const handleCloseNewCostEstimate = () => {
    setShowNewCostEstimateDialog(false);
    // Invalidate cost estimates to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
  };

  const isLoading = isLoadingCustomer || isLoadingRepairs || isLoadingCostEstimates;
  
  if (!open) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px]">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Lade Kundendaten...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!customer && !isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px]">
          <div className="flex items-center justify-center p-8">
            <span>Kunde nicht gefunden</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            <span>{customer?.firstName} {customer?.lastName}</span>
          </DialogTitle>
          <DialogDescription>
            Kundendetails und zugehörige Aufträge
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Kundendaten */}
          <div className="bg-blue-50 rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5" />
                Kundendaten
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditCustomer}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{customer?.firstName} {customer?.lastName}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Telefon</div>
                    <div>{customer?.phone}</div>
                  </div>
                </div>
                
                {customer?.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">E-Mail</div>
                      <div>{customer.email}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {(customer?.address || customer?.zipCode || customer?.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground">Adresse</div>
                      <div>
                        {customer?.address && <div>{customer.address}</div>}
                        {(customer?.zipCode || customer?.city) && (
                          <div>{customer?.zipCode} {customer?.city}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Kunde seit</div>
                    <div>{formatDate(customer?.createdAt || '')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reparaturen */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Reparaturen ({repairs?.length || 0})
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRepairs(!showRepairs)}
                  className="h-6 px-2 ml-2"
                >
                  {showRepairs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </h3>
              <Button
                variant="default"
                size="sm"
                onClick={handleNewRepair}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Neue Reparatur
              </Button>
            </div>
            
            {showRepairs && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {repairs && repairs.length > 0 ? (
                  repairs.map((repair) => (
                    <div key={repair.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{repair.brand} {repair.model}</div>
                          <div className="text-sm text-muted-foreground">{repair.issue}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(repair.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(repair.status)}
                        <div className="text-sm font-medium">{repair.estimatedCost} €</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Keine Reparaturen vorhanden
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Kostenvoranschläge */}
          <div className="bg-green-50 rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Kostenvoranschläge ({costEstimates?.length || 0})
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCostEstimates(!showCostEstimates)}
                  className="h-6 px-2 ml-2"
                >
                  {showCostEstimates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </h3>
              <Button
                variant="default"
                size="sm"
                onClick={handleNewCostEstimate}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Neuer Kostenvoranschlag
              </Button>
            </div>
            
            {showCostEstimates && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {costEstimates && costEstimates.length > 0 ? (
                  costEstimates.map((estimate) => (
                    <div key={estimate.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{estimate.brand} {estimate.model}</div>
                          <div className="text-sm text-muted-foreground">{estimate.issue}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(estimate.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={estimate.status === 'angenommen' ? 'default' : 
                                   estimate.status === 'abgelehnt' ? 'destructive' : 'secondary'}
                        >
                          {estimate.status}
                        </Badge>
                        <div className="text-sm font-medium">{estimate.total} €</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Keine Kostenvoranschläge vorhanden
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Edit Customer Dialog */}
      {showEditDialog && (
        <EditCustomerDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          customer={customer}
        />
      )}

      {/* New Cost Estimate Dialog */}
      {showNewCostEstimateDialog && customer && (
        <NewCostEstimateDialog
          open={showNewCostEstimateDialog}
          onClose={handleCloseNewCostEstimate}
          preselectedCustomer={{
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            zipCode: customer.zipCode,
            city: customer.city
          }}
        />
      )}
    </Dialog>
  );
}