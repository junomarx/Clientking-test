import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Smartphone, Users, AlertCircle, Edit, Trash2, Wifi, WifiOff } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

interface KioskEmployee {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
}

interface KioskManagementProps {
  shopId: number;
}

export default function KioskManagement({ shopId }: KioskManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editKiosk, setEditKiosk] = useState<KioskEmployee | null>(null);
  const [newKioskData, setNewKioskData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [editKioskData, setEditKioskData] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });

  // Kiosk-Mitarbeiter laden
  const { data: kioskEmployees = [], isLoading } = useQuery({
    queryKey: ['/api/kiosk/employees', shopId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/kiosk/employees/${shopId}`);
      return response.json();
    },
    enabled: !!shopId
  });

  // Kiosk-Verfügbarkeit prüfen
  const { data: kioskAvailability } = useQuery({
    queryKey: ['/api/kiosk/availability', shopId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/kiosk/availability/${shopId}`);
      return response.json();
    },
    refetchInterval: 5000, // Alle 5 Sekunden prüfen
    enabled: !!shopId
  });

  // Neuen Kiosk-Mitarbeiter erstellen
  const createKioskMutation = useMutation({
    mutationFn: async (kioskData: { email: string; password: string; firstName: string; lastName: string }) => {
      const response = await apiRequest('POST', '/api/kiosk/create', kioskData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Kiosk-Mitarbeiter erstellt',
        description: 'Der Kiosk-Mitarbeiter wurde erfolgreich erstellt.',
      });
      setIsCreateDialogOpen(false);
      setNewKioskData({ email: '', password: '', firstName: '', lastName: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/kiosk/employees', shopId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Kiosk-Mitarbeiter konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  // Kiosk-Mitarbeiter bearbeiten
  const editKioskMutation = useMutation({
    mutationFn: async (data: { kioskId: number; email: string; firstName: string; lastName: string }) => {
      const response = await apiRequest('PATCH', `/api/kiosk/${data.kioskId}`, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Kiosk-Mitarbeiter bearbeitet',
        description: 'Die Änderungen wurden erfolgreich gespeichert.',
      });
      setEditKiosk(null);
      queryClient.invalidateQueries({ queryKey: ['/api/kiosk/employees', shopId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Bearbeiten des Kiosk-Mitarbeiters.',
        variant: 'destructive',
      });
    },
  });

  // Kiosk-Mitarbeiter löschen
  const deleteKioskMutation = useMutation({
    mutationFn: async (kioskId: number) => {
      const response = await apiRequest('DELETE', `/api/kiosk/${kioskId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Kiosk-Mitarbeiter gelöscht',
        description: 'Der Kiosk-Mitarbeiter wurde erfolgreich gelöscht.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kiosk/employees', shopId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Löschen des Kiosk-Mitarbeiters.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateKiosk = () => {
    if (!newKioskData.email || !newKioskData.password || !newKioskData.firstName || !newKioskData.lastName) {
      toast({
        title: 'Unvollständige Daten',
        description: 'Bitte füllen Sie alle Felder aus.',
        variant: 'destructive',
      });
      return;
    }

    createKioskMutation.mutate(newKioskData);
  };

  const handleEditKiosk = (kiosk: KioskEmployee) => {
    setEditKiosk(kiosk);
    setEditKioskData({
      email: kiosk.email,
      firstName: kiosk.firstName || '',
      lastName: kiosk.lastName || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editKiosk) return;
    
    if (!editKioskData.email || !editKioskData.firstName || !editKioskData.lastName) {
      toast({
        title: 'Unvollständige Daten',
        description: 'Bitte füllen Sie alle Felder aus.',
        variant: 'destructive',
      });
      return;
    }

    editKioskMutation.mutate({
      kioskId: editKiosk.id,
      email: editKioskData.email,
      firstName: editKioskData.firstName,
      lastName: editKioskData.lastName
    });
  };

  const handleDeleteKiosk = (kioskId: number) => {
    deleteKioskMutation.mutate(kioskId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kiosk-Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Kiosk-System Status
          </CardTitle>
          <CardDescription>
            Übersicht über die Kiosk-Verfügbarkeit und -Mitarbeiter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {kioskEmployees.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Kiosk-Mitarbeiter
              </div>
            </div>
            <div className="text-center">
              <Badge variant={kioskAvailability?.isOnline ? "default" : "secondary"}>
                {kioskAvailability?.isOnline ? "Online" : "Offline"}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">
                Kiosk-Status
              </div>
            </div>
            <div className="text-center">
              {kioskAvailability?.kioskUser && (
                <>
                  <div className="text-sm font-medium">
                    {kioskAvailability.kioskUser.firstName} {kioskAvailability.kioskUser.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Aktiver Kiosk
                  </div>
                </>
              )}
              {!kioskAvailability?.kioskUser && (
                <div className="text-sm text-muted-foreground">
                  Kein Kiosk verfügbar
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kiosk-Mitarbeiter Liste */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kiosk-Mitarbeiter
              </CardTitle>
              <CardDescription>
                Verwalten Sie die Kiosk-Terminals für Ihren Shop
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Kiosk hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Kiosk-Mitarbeiter erstellen</DialogTitle>
                  <DialogDescription>
                    Erstellen Sie einen neuen Kiosk-Mitarbeiter für Tablet-Terminals
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Vorname</Label>
                      <Input
                        id="firstName"
                        placeholder="z.B. Kiosk"
                        value={newKioskData.firstName}
                        onChange={(e) => setNewKioskData({ ...newKioskData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nachname</Label>
                      <Input
                        id="lastName"
                        placeholder="z.B. Terminal 1"
                        value={newKioskData.lastName}
                        onChange={(e) => setNewKioskData({ ...newKioskData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">E-Mail-Adresse</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="kiosk@meinshop.de"
                      value={newKioskData.email}
                      onChange={(e) => setNewKioskData({ ...newKioskData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Passwort</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Sicheres Passwort"
                      value={newKioskData.password}
                      onChange={(e) => setNewKioskData({ ...newKioskData, password: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={handleCreateKiosk} 
                      disabled={createKioskMutation.isPending}
                    >
                      {createKioskMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {kioskEmployees.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Noch keine Kiosk-Mitarbeiter</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie einen Kiosk-Mitarbeiter, um Tablet-Terminals zu verwenden.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ersten Kiosk erstellen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {kioskEmployees.map((kiosk: KioskEmployee) => (
                <div
                  key={kiosk.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{kiosk.firstName} {kiosk.lastName}</div>
                      <div className="text-sm text-muted-foreground">
                        {kiosk.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={kiosk.isActive ? "default" : "secondary"}>
                      {kiosk.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                    {kioskAvailability?.kioskUser?.id === kiosk.id && (
                      <Badge variant="outline" className="text-green-600">
                        Online
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditKiosk(kiosk)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Kiosk-Mitarbeiter löschen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sind Sie sicher, dass Sie {kiosk.firstName} {kiosk.lastName} löschen möchten? 
                            Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteKiosk(kiosk.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bearbeiten Dialog */}
      {editKiosk && (
        <Dialog open={!!editKiosk} onOpenChange={() => setEditKiosk(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kiosk-Mitarbeiter bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie die Daten des Kiosk-Mitarbeiters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">Vorname</Label>
                  <Input
                    id="edit-firstName"
                    value={editKioskData.firstName}
                    onChange={(e) => setEditKioskData({ ...editKioskData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Nachname</Label>
                  <Input
                    id="edit-lastName"
                    value={editKioskData.lastName}
                    onChange={(e) => setEditKioskData({ ...editKioskData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-email">E-Mail-Adresse</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editKioskData.email}
                  onChange={(e) => setEditKioskData({ ...editKioskData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditKiosk(null)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={editKioskMutation.isPending}
              >
                {editKioskMutation.isPending ? 'Speichere...' : 'Speichern'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}