import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Repair, Customer } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Smartphone, 
  AlertCircle,
  Clock,
  CheckCircle,
  Package,
  Home as HomeIcon
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { RepairDetailsDialog } from '@/components/repairs/RepairDetailsDialog';

const statusConfig = {
  'eingegangen': { 
    label: 'Eingegangen', 
    color: 'bg-blue-500', 
    icon: Package 
  },
  'in_reparatur': { 
    label: 'In Reparatur', 
    color: 'bg-yellow-500', 
    icon: Clock 
  },
  'abholbereit': { 
    label: 'Abholbereit', 
    color: 'bg-green-500', 
    icon: CheckCircle 
  },
  'abgeholt': { 
    label: 'Abgeholt', 
    color: 'bg-gray-500', 
    icon: CheckCircle 
  },
  'ausser_haus': { 
    label: 'Außer Haus', 
    color: 'bg-purple-500', 
    icon: HomeIcon 
  }
};

export default function RepairDetailsPage() {
  const { repairId } = useParams();
  const [, setLocation] = useLocation();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Lade Reparaturdaten
  const { data: repair, isLoading: isLoadingRepair, error: repairError } = useQuery<Repair>({
    queryKey: ['/api/repairs', repairId],
    queryFn: async () => {
      const response = await fetch(`/api/repairs/${repairId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (!response.ok) {
        throw new Error('Reparatur nicht gefunden');
      }
      return response.json();
    },
    enabled: !!repairId,
  });

  // Lade Kundendaten
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ['/api/customers', repair?.customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${repair?.customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (!response.ok) {
        throw new Error('Kunde nicht gefunden');
      }
      return response.json();
    },
    enabled: !!repair?.customerId,
  });

  const isLoading = isLoadingRepair || isLoadingCustomer;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Reparaturdetails werden geladen...</p>
        </div>
      </div>
    );
  }

  if (repairError || !repair) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
          <h1 className="text-2xl font-bold">Reparatur nicht gefunden</h1>
          <p className="text-muted-foreground">
            Die angeforderte Reparatur konnte nicht gefunden werden.
          </p>
          <Button onClick={() => setLocation('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[repair.status as keyof typeof statusConfig] || {
    label: repair.status,
    color: 'bg-gray-500',
    icon: AlertCircle
  };

  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          
          <Button 
            onClick={() => setShowDetailsDialog(true)}
            className="gap-2"
          >
            Details bearbeiten
          </Button>
        </div>

        {/* Hauptkarte */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Auftrag {repair.orderCode || `#${repair.id}`}
                </CardTitle>
                <p className="text-primary-foreground/80 mt-1">
                  Erstellt am {formatDate(repair.createdAt)}
                </p>
              </div>
              <Badge 
                className={`${statusInfo.color} text-white px-3 py-1 flex items-center gap-2`}
              >
                <StatusIcon className="h-4 w-4" />
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Kundendaten */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Kundendaten
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Name:</strong> {customer?.firstName} {customer?.lastName}</p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {customer?.phone}
                  </p>
                  {customer?.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {customer.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Gerätedaten */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Gerätedaten
              </h3>
              <div className="space-y-2">
                <p><strong>Hersteller:</strong> {repair.brand}</p>
                <p><strong>Modell:</strong> {repair.model}</p>
                <p><strong>Gerätetyp:</strong> {repair.deviceType}</p>
                {repair.serialNumber && (
                  <p><strong>Seriennummer:</strong> {repair.serialNumber}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Reparaturdetails */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Reparaturdetails
              </h3>
              <div className="space-y-2">
                <p><strong>Problem:</strong></p>
                <p className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                  {repair.issue}
                </p>
                {repair.description && (
                  <>
                    <p><strong>Beschreibung:</strong></p>
                    <p className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                      {repair.description}
                    </p>
                  </>
                )}
                {repair.estimatedCost && (
                  <p><strong>Geschätzte Kosten:</strong> {repair.estimatedCost}€</p>
                )}
              </div>
            </div>

            {/* Techniker Info falls vorhanden */}
            {repair.technicianNote && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Techniker Information</h3>
                  <p className="bg-blue-50 p-3 rounded-md">
                    {repair.technicianNote}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      {showDetailsDialog && (
        <RepairDetailsDialog
          open={showDetailsDialog}
          onClose={() => setShowDetailsDialog(false)}
          repairId={repair.id}
        />
      )}
    </div>
  );
}