import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Permission {
  id: number;
  multiShopAdminId: number;
  shopId: number;
  shopOwnerId: number;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  adminName: string;
  shopName: string;
}

interface PermissionDialogProps {
  permissions: Permission[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PermissionDialog({ permissions, isOpen, onClose }: PermissionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const grantPermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      const response = await apiRequest('POST', `/api/permissions/${permissionId}/grant`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Zugriff gewährt',
        description: 'Der Multi-Shop Administrator kann jetzt auf Ihre Shop-Daten zugreifen.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Gewähren des Zugriffs',
        variant: 'destructive',
      });
    },
  });

  const revokePermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      const response = await apiRequest('POST', `/api/permissions/${permissionId}/revoke`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Zugriff widerrufen',
        description: 'Der Zugriff wurde erfolgreich widerrufen.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Widerrufen des Zugriffs',
        variant: 'destructive',
      });
    },
  });

  const handleGrant = (permissionId: number) => {
    grantPermissionMutation.mutate(permissionId);
  };

  const handleRevoke = (permissionId: number) => {
    revokePermissionMutation.mutate(permissionId);
  };

  const pendingPermissions = permissions.filter(p => !p.granted && !p.revokedAt);
  const grantedPermissions = permissions.filter(p => p.granted && !p.revokedAt);

  if (permissions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Multi-Shop Zugriffsverwaltung
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">Keine ausstehenden Berechtigungsanfragen</p>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Shop Zugriffsverwaltung
          </DialogTitle>
        </DialogHeader>
        
        {/* DSGVO Hinweis */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Datenschutz-Hinweis:</strong> Durch die Gewährung des Zugriffs erhalten Multi-Shop Administratoren 
            vollständigen Zugang zu allen Daten Ihres Shops (Kunden, Reparaturen, Statistiken). 
            Sie können diese Berechtigung jederzeit widerrufen.
          </AlertDescription>
        </Alert>

        {/* Ausstehende Anfragen */}
        {pendingPermissions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Ausstehende Anfragen ({pendingPermissions.length})
            </h3>
            
            <div className="space-y-3">
              {pendingPermissions.map((permission) => (
                <div 
                  key={permission.id} 
                  className="border rounded-lg p-4 bg-amber-50 border-amber-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Administrator: {permission.adminName}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        möchte Zugriff auf Shop "{permission.shopName}"
                      </p>
                      <p className="text-xs text-gray-500">
                        Angefragt am: {new Date(permission.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleGrant(permission.id)}
                        disabled={grantPermissionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Erlauben
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(permission.id)}
                        disabled={revokePermissionMutation.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gewährte Berechtigungen */}
        {grantedPermissions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Aktive Berechtigungen ({grantedPermissions.length})
            </h3>
            
            <div className="space-y-3">
              {grantedPermissions.map((permission) => (
                <div 
                  key={permission.id} 
                  className="border rounded-lg p-4 bg-green-50 border-green-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Administrator: {permission.adminName}
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">
                        Hat Zugriff auf Shop "{permission.shopName}"
                      </p>
                      <p className="text-xs text-gray-500">
                        Gewährt am: {permission.grantedAt ? new Date(permission.grantedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Unbekannt'}
                      </p>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevoke(permission.id)}
                      disabled={revokePermissionMutation.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Widerrufen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}