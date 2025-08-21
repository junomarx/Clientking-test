import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, UserPlus, Shield, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MultiShopAdmin {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export function MultiShopAdminManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Multi-Shop-Admins laden
  const { data: multiShopAdmins, isLoading } = useQuery<MultiShopAdmin[]>({
    queryKey: ['/api/multi-shop/admins'],
  });

  // Neuen Multi-Shop-Admin erstellen
  const createMultiShopAdminMutation = useMutation({
    mutationFn: async (adminData: { username: string; email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/assign-multishop-admin', adminData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Multi-Shop-Admin erstellt",
        description: `${data.username} wurde erfolgreich als Multi-Shop-Admin erstellt`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/admins'] });
      setIsCreateDialogOpen(false);
      setNewAdminData({ username: "", email: "", password: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Erstellen",
        description: error.message || "Fehler beim Erstellen des Multi-Shop-Admins",
        variant: "destructive",
      });
    },
  });

  // Multi-Shop-Admin löschen
  const deleteMultiShopAdminMutation = useMutation({
    mutationFn: async (adminId: number) => {
      const response = await apiRequest('DELETE', `/api/multi-shop/admin/${adminId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Multi-Shop-Admin gelöscht",
        description: "Der Multi-Shop-Admin wurde erfolgreich entfernt",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/admins'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message || "Fehler beim Löschen des Multi-Shop-Admins",
        variant: "destructive",
      });
    },
  });

  const handleCreateAdmin = () => {
    if (!newAdminData.username || !newAdminData.email || !newAdminData.password) {
      toast({
        title: "Fehlende Eingaben",
        description: "Bitte füllen Sie alle Felder aus",
        variant: "destructive",
      });
      return;
    }

    createMultiShopAdminMutation.mutate(newAdminData);
  };

  const handleDeleteAdmin = (adminId: number) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Multi-Shop-Admin löschen möchten?")) {
      deleteMultiShopAdminMutation.mutate(adminId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          Multi-Shop-Admin Verwaltung
        </CardTitle>
        <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>DSGVO-Hinweis:</strong> Multi-Shop-Admins erhalten Zugriff auf Ihre Kundendaten. 
              Gewähren Sie nur vertrauenswürdigen Personen diese Berechtigung.
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm text-gray-600">
              {multiShopAdmins?.length || 0} Multi-Shop-Admin(s)
            </span>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Neuen Admin erstellen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Multi-Shop-Admin erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Benutzername</Label>
                  <Input
                    id="username"
                    value={newAdminData.username}
                    onChange={(e) => setNewAdminData({ ...newAdminData, username: e.target.value })}
                    placeholder="admin123"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                    placeholder="Sicheres Passwort eingeben"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateAdmin} 
                    disabled={createMultiShopAdminMutation.isPending}
                    className="flex-1"
                  >
                    {createMultiShopAdminMutation.isPending ? "Wird erstellt..." : "Admin erstellen"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {multiShopAdmins && multiShopAdmins.length > 0 ? (
          <div className="space-y-3">
            {multiShopAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{admin.username}</span>
                    {admin.isActive ? (
                      <Badge variant="default" className="bg-green-600">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">Inaktiv</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {admin.email}
                  </div>
                  <div className="text-xs text-gray-400">
                    Erstellt: {new Date(admin.createdAt).toLocaleDateString('de-DE')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAdmin(admin.id)}
                  disabled={deleteMultiShopAdminMutation.isPending}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Keine Multi-Shop-Admins vorhanden</p>
            <p className="text-sm">Erstellen Sie einen Multi-Shop-Admin, um externen Zugriff zu gewähren</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}