import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Package, User, Phone, Mail, Calendar, Euro, FileText } from "lucide-react";
import { RepairDetailsDialog } from "@/components/repairs/RepairDetailsDialog";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shopId: number | null;
  userId: number | null;
}

interface RepairWithCustomer {
  id: number;
  orderCode: string;
  customerId: number;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  status: string;
  estimatedCost: number | null;
  depositAmount: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shopId: number | null;
  userId: number | null;
  customer: Customer;
}

export function OrdersTab() {
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);

  const { data: repairsWaitingForParts = [], isLoading, error } = useQuery<RepairWithCustomer[]>({
    queryKey: ['/api/repairs/waiting-for-parts'],
    refetchInterval: 30000, // Aktualisierung alle 30 Sekunden
  });

  const handleRepairClick = (repairId: number) => {
    setSelectedRepairId(repairId);
    setIsRepairDialogOpen(true);
  };

  const handleRepairDialogClose = () => {
    setIsRepairDialogOpen(false);
    setSelectedRepairId(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Fehler beim Laden der Bestellungen</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        <Badge variant="secondary" className="ml-2">
          {repairsWaitingForParts.length}
        </Badge>
      </div>

      {repairsWaitingForParts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Bestellungen
            </h3>
            <p className="text-gray-500">
              Aktuell warten keine Reparaturen auf Ersatzteile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {repairsWaitingForParts.map((repair) => (
            <Card key={repair.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {repair.orderCode}
                  </CardTitle>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Warten auf Ersatzteile
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Geräte-Informationen */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{repair.deviceType}</span>
                      <span className="text-gray-500">•</span>
                      <span>{repair.brand} {repair.model}</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {repair.issue}
                    </p>
                    {repair.estimatedCost && (
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          {repair.estimatedCost.toFixed(2)} €
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Kunden-Informationen */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {repair.customer.firstName} {repair.customer.lastName}
                      </span>
                    </div>
                    {repair.customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{repair.customer.phone}</span>
                      </div>
                    )}
                    {repair.customer.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{repair.customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Erstellt: {formatDate(repair.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {repair.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600 italic">
                      "{repair.notes}"
                    </p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRepairClick(repair.id)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Details anzeigen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Repair Details Dialog */}
      <RepairDetailsDialog
        open={isRepairDialogOpen}
        onClose={handleRepairDialogClose}
        repairId={selectedRepairId}
        mode="dashboard"
      />
    </div>
  );
}