import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar, CheckCircle, Clock, Mail, User, Settings, Trash2, Plus, UserMinus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MultiShopAdmin {
  id: number;
  username: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
  accessibleShops: Array<{
    id: number;
    name: string;
    businessName?: string;
    shopId: number;
    grantedAt: string | null;
    isActive?: boolean;
  }>;
  totalShops?: number;
}

interface Shop {
  id: number;
  businessName: string;
  isActive: boolean;
}

interface MultiShopAdminDetailsDialogProps {
  admin: MultiShopAdmin | null;
  isOpen: boolean;
  onClose: () => void;
  onRevoke?: (adminId: number, shopId: number) => void;
  onDelete?: (adminId: number) => void;
  onGrantAccess?: (adminId: number, shopId: number) => void;
}

export function MultiShopAdminDetailsDialog({
  admin,
  isOpen,
  onClose,
  onRevoke,
  onDelete,
  onGrantAccess
}: MultiShopAdminDetailsDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  
  // Alle verfügbaren Shops laden
  const { data: allShops = [] } = useQuery<Shop[]>({
    queryKey: ["/api/superadmin/shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/shops");
      return response.json();
    },
    enabled: isOpen && !!admin
  });

  if (!admin) return null;

  // Shops filtern, die noch nicht zugewiesen sind
  const availableShops = allShops.filter(shop => 
    !admin.accessibleShops.some(access => access.shopId === shop.id)
  );

  const handleRevokeAccess = (shopId: number) => {
    if (onRevoke) {
      onRevoke(admin.id, shopId);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm(
      `Möchten Sie den Multi-Shop Admin "${admin.username}" wirklich löschen?\n\nDies wird alle Shop-Zugriffe widerrufen und kann nicht rückgängig gemacht werden.`
    );
    
    if (confirmed) {
      setIsDeleting(true);
      try {
        await onDelete(admin.id);
        toast({
          title: "Admin gelöscht",
          description: `Multi-Shop Admin "${admin.username}" wurde erfolgreich gelöscht.`,
        });
        onClose();
      } catch (error) {
        toast({
          title: "Fehler beim Löschen",
          description: "Der Admin konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleGrantAccess = async () => {
    if (!onGrantAccess || !selectedShopId) return;
    
    setIsGrantingAccess(true);
    try {
      await onGrantAccess(admin.id, parseInt(selectedShopId));
      setSelectedShopId("");
      toast({
        title: "Zugriff gewährt",
        description: "Shop-Zugriff wurde erfolgreich gewährt.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Shop-Zugriff konnte nicht gewährt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Multi-Shop Admin Details: {admin.username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Admin Grundinformationen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Administrator Information</CardTitle>
              <CardDescription>
                Grundlegende Informationen über den Multi-Shop Administrator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Benutzername</label>
                  <p className="text-base font-medium">{admin.username}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">E-Mail</label>
                  <p className="text-base">{admin.email || 'Nicht angegeben'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>
                    <Badge variant={admin.isActive ? 'default' : 'secondary'}>
                      {admin.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Erstellt am</label>
                  <p className="text-base">
                    {new Date(admin.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop-Zugriffe */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Gewährte Shop-Zugriffe ({admin.accessibleShops.length})
                  </CardTitle>
                  <CardDescription>
                    Übersicht über alle Shops, auf die dieser Administrator Zugriff hat
                  </CardDescription>
                </div>
                
                {/* Neuen Shop-Zugriff hinzufügen */}
                {onGrantAccess && availableShops.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Shop auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableShops.filter((shop, index, self) => 
                          index === self.findIndex(s => s.id === shop.id)
                        ).map((shop) => (
                          <SelectItem key={shop.id} value={shop.id.toString()}>
                            {shop.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleGrantAccess}
                      disabled={!selectedShopId || isGrantingAccess}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {isGrantingAccess ? "Gewähre..." : "Hinzufügen"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {admin.accessibleShops.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Shop-Zugriffe gewährt
                  </h3>
                  <p className="text-gray-500">
                    Dieser Multi-Shop Administrator hat noch keine Berechtigung für Shops erhalten.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {admin.accessibleShops.map((shop) => (
                    <div 
                      key={shop.shopId} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start space-x-3">
                        <Building2 className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">{shop.businessName || shop.name}</h4>
                          <p className="text-sm text-gray-500">Shop-ID: {shop.shopId}</p>
                          {shop.grantedAt && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-gray-500">
                                Gewährt am: {new Date(shop.grantedAt).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Berechtigt
                        </Badge>
                        
                        {onRevoke && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeAccess(shop.shopId)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Widerrufen
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aktionen */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteAdmin}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Admin löschen
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Schließen
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}