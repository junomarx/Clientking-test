import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, User, Smartphone, AlertCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Repair } from '@/lib/types';
import { Customer } from '@shared/schema';
import { RepairDetailsDialog } from '@/components/repairs/RepairDetailsDialog';

interface RepairWithCustomer extends Repair {
  customer: Customer;
}

export function OrdersTab() {
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch repairs that are waiting for spare parts
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['/api/repairs/waiting-for-parts'],
    queryFn: async () => {
      const response = await fetch('/api/repairs/waiting-for-parts');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Bestellungen');
      }
      return response.json();
    },
  });

  const openDetailsDialog = (repairId: number) => {
    setSelectedRepairId(repairId);
    setShowDetailsDialog(true);
  };

  const closeDetailsDialog = () => {
    setShowDetailsDialog(false);
    setSelectedRepairId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Bestellungen...</p>
        </div>
      </div>
    );
  }

  const repairs: RepairWithCustomer[] = ordersData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bestellungen</h1>
          <p className="text-muted-foreground">
            Reparaturen, die auf Ersatzteile warten
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {repairs.length} Reparatur{repairs.length !== 1 ? 'en' : ''}
        </Badge>
      </div>

      {/* Orders List */}
      {repairs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine ausstehenden Bestellungen</h3>
            <p className="text-muted-foreground text-center">
              Alle Reparaturen haben entweder alle benötigten Ersatzteile oder warten nicht auf Teile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {repairs.map((repair) => (
            <Card key={repair.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header with order code and status */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {repair.orderCode || `#${repair.id}`}
                      </h3>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Warten auf Ersatzteile
                      </Badge>
                    </div>

                    {/* Device info */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Smartphone className="h-4 w-4" />
                      <span>{repair.brand} {repair.model}</span>
                      {repair.deviceType && (
                        <>
                          <span>•</span>
                          <span>{repair.deviceType}</span>
                        </>
                      )}
                    </div>

                    {/* Customer info */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{repair.customer.firstName} {repair.customer.lastName}</span>
                      {repair.customer.phone && (
                        <>
                          <span>•</span>
                          <span>{repair.customer.phone}</span>
                        </>
                      )}
                    </div>

                    {/* Issue description */}
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{repair.issue}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Eingegangen: {format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </span>
                      {repair.estimatedCost && (
                        <span>
                          Geschätzte Kosten: {repair.estimatedCost}€
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailsDialog(repair.id)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Repair Details Dialog */}
      <RepairDetailsDialog
        open={showDetailsDialog}
        onClose={closeDetailsDialog}
        repairId={selectedRepairId}
        mode="normal"
      />
    </div>
  );
}