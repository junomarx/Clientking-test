import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Shield, Clock } from 'lucide-react';

// Typen für Support-Anfragen
interface SupportRequest {
  id: number;
  superadminId: number;
  superadminUsername?: string;
  reason: string;
  accessType: string;
  startedAt: string;
  status: string;
  isActive: boolean;
}

export default function SupportRequestsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Anfragen laden
  const { data: supportRequests = [], isLoading, error } = useQuery<SupportRequest[]>({
    queryKey: ['/api/support/requests/pending'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/support/requests/pending');
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Support-Anfragen: ${response.statusText}`);
      }
      return response.json();
    },
    // Aktualisierung alle 30 Sekunden
    refetchInterval: 30000,
  });

  // Anfrage genehmigen
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('POST', `/api/support/requests/${requestId}/approve`);
      if (!response.ok) {
        throw new Error('Fehler bei der Genehmigung der Anfrage');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Anfrage genehmigt',
        description: 'Die Support-Anfrage wurde erfolgreich genehmigt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/support/requests/pending'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  // Anfrage ablehnen
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('POST', `/api/support/requests/${requestId}/reject`);
      if (!response.ok) {
        throw new Error('Fehler bei der Ablehnung der Anfrage');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Anfrage abgelehnt',
        description: 'Die Support-Anfrage wurde abgelehnt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/support/requests/pending'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  // Datum formatieren
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
  };

  // Zugriffstyp als lesbaren Text
  const getAccessTypeLabel = (accessType: string) => {
    switch (accessType) {
      case 'all':
        return 'Vollzugriff';
      case 'repair_data':
        return 'Reparaturdaten';
      case 'customer_data':
        return 'Kundendaten';
      case 'business_settings':
        return 'Geschäftseinstellungen';
      default:
        return accessType;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>Fehler beim Laden der Support-Anfragen</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Support-Anfragen
          </CardTitle>
          <CardDescription>
            Hier können Sie Support-Anfragen von Administratoren genehmigen oder ablehnen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {supportRequests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Keine ausstehenden Support-Anfragen</p>
              <p className="text-sm mt-1">Anfragen werden hier angezeigt, wenn der Support Zugriff auf Ihre Daten benötigt</p>
            </div>
          ) : (
            <Table>
              <TableCaption>Offene Support-Anfragen: {supportRequests.length}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Administratorname</TableHead>
                  <TableHead>Zugriffsart</TableHead>
                  <TableHead>Begründung</TableHead>
                  <TableHead>Angefragt am</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.superadminUsername || `Administrator #${request.superadminId}`}</TableCell>
                    <TableCell>
                      <Badge variant={request.accessType === 'all' ? 'destructive' : 'outline'}>
                        {getAccessTypeLabel(request.accessType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate" title={request.reason}>
                      {request.reason}
                    </TableCell>
                    <TableCell>{formatDate(request.startedAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Offene Anfrage
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => rejectMutation.mutate(request.id)}
                          disabled={rejectMutation.isPending || approveMutation.isPending}
                        >
                          {rejectMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                          <XCircle className="h-4 w-4 text-red-500" />
                          Ablehnen
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => approveMutation.mutate(request.id)}
                          disabled={rejectMutation.isPending || approveMutation.isPending}
                        >
                          {approveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                          <CheckCircle className="h-4 w-4" />
                          Genehmigen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Datenschutzhinweise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>
              <strong>Wichtig:</strong> Die Genehmigung einer Support-Anfrage gewährt dem Administrator
              temporären Zugriff auf die Daten Ihres Shops im angegebenen Umfang.
            </p>
            <p>
              Alle Zugriffe werden protokolliert und sind zeitlich begrenzt. Sie können den Zugriff
              jederzeit widerrufen, indem Sie den Support kontaktieren.
            </p>
            <p>
              Der Support-Zugriff ist DSGVO-konform und dient ausschließlich der Unterstützung
              bei technischen Problemen oder der Beantwortung Ihrer Fragen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}