import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Settings } from "lucide-react";
import { SparePartsManagementDialog } from "./SparePartsManagementDialog";
import { useState } from "react";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  createdAt: Date;
  shopId: number | null;
  userId: number | null;
}

interface SparePart {
  id: number;
  repairId: number;
  partName: string;
  status: "bestellen" | "bestellt" | "eingetroffen";
  createdAt: Date;
  updatedAt: Date;
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
  spareParts: SparePart[];
}

export function OrdersTab() {
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [isSparePartsDialogOpen, setIsSparePartsDialogOpen] = useState(false);

  const { data: repairsWaitingForParts = [], isLoading, error } = useQuery<RepairWithCustomer[]>({
    queryKey: ['/api/repairs/waiting-for-parts'],
    refetchInterval: 30000,
  });

  const handleManageParts = (repairId: number) => {
    setSelectedRepairId(repairId);
    setIsSparePartsDialogOpen(true);
  };

  const handleSparePartsDialogClose = () => {
    setIsSparePartsDialogOpen(false);
    setSelectedRepairId(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'destructive';
      case 'bestellt':
        return 'secondary';
      case 'eingetroffen':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'Bestellen';
      case 'bestellt':
        return 'Bestellt';
      case 'eingetroffen':
        return 'Eingetroffen';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            <p className="text-sm text-gray-600 mt-2">{error?.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (repairsWaitingForParts.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
          <Badge variant="secondary" className="ml-2">0</Badge>
        </div>
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
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <Package className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bestellungen</h1>
        <Badge variant="secondary" className="ml-2">
          {repairsWaitingForParts.length}
        </Badge>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auftragsnummer</TableHead>
                <TableHead>Modell</TableHead>
                <TableHead>Ersatzteile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repairsWaitingForParts.map((repair) => (
                <TableRow key={repair.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {repair.orderCode}
                  </TableCell>
                  <TableCell>
                    {repair.brand} {repair.model}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {repair.spareParts && repair.spareParts.length > 0 ? (
                        repair.spareParts.map((part) => (
                          <div key={part.id} className="text-sm">
                            {part.partName}
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">Keine Ersatzteile</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {repair.spareParts && repair.spareParts.length > 0 ? (
                      <div className="space-y-1">
                        {repair.spareParts.map((part) => (
                          <div key={part.id}>
                            <Badge variant={getStatusBadgeVariant(part.status)} className="text-xs">
                              {getStatusLabel(part.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Keine Ersatzteile
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleManageParts(repair.id)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Verwalten
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {repairsWaitingForParts.map((repair) => (
          <Card key={repair.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">#{repair.orderCode}</div>
                  <div className="text-gray-600 text-sm">{repair.brand} {repair.model}</div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleManageParts(repair.id)}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  <span className="text-xs">Verwalten</span>
                </Button>
              </div>
              
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Ersatzteile:</div>
                {repair.spareParts && repair.spareParts.length > 0 ? (
                  <div className="space-y-2">
                    {repair.spareParts.map((part) => (
                      <div key={part.id} className="flex justify-between items-center">
                        <span className="text-sm">{part.partName}</span>
                        <Badge variant={getStatusBadgeVariant(part.status)} className="text-xs">
                          {getStatusLabel(part.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Keine Ersatzteile</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedRepairId && (
        <SparePartsManagementDialog
          open={isSparePartsDialogOpen}
          onClose={handleSparePartsDialogClose}
          repairId={selectedRepairId}
        />
      )}
    </div>
  );
}