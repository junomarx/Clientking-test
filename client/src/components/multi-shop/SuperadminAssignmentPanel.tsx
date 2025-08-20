import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  UserPlus, 
  Building2, 
  Shield, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search,
  ArrowRight,
  Settings
} from 'lucide-react';

interface MultiShopAdmin {
  id: number;
  username: string;
  email?: string;
  isActive: boolean;
  accessibleShops: Array<{
    id: number;
    name: string;
    businessName?: string;
    shopId: number;
    grantedAt: string;
  }>;
}

interface Shop {
  id: number;
  username: string;
  businessName: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Superadmin Panel für Multi-Shop Admin Zuweisungen
 * Ermöglicht Bulk-Zuweisungen und Shop-Management
 */
export function SuperadminAssignmentPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [selectedShops, setSelectedShops] = useState<number[]>([]);
  const [assignmentReason, setAssignmentReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-Shop Admins laden
  const { data: multiShopAdmins = [], isLoading: loadingAdmins } = useQuery<MultiShopAdmin[]>({
    queryKey: ['/api/multi-shop/admins'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/multi-shop/admins');
      return response.json();
    }
  });

  // Alle Shops laden (für Superadmin)
  const { data: allShops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ['/api/superadmin/shops'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/shops');
      return response.json();
    }
  });

  // Permission Overview laden
  const { data: permissionOverview } = useQuery({
    queryKey: ['/api/superadmin/permission-overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/permission-overview');
      return response.json();
    }
  });

  // Shop-Zuweisung Mutation
  const assignShopsMutation = useMutation({
    mutationFn: async (data: { 
      multiShopAdminId: number; 
      shopIds: number[]; 
      reason: string 
    }) => {
      const response = await apiRequest('POST', '/api/superadmin/assign-shops', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/admins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/permission-overview'] });
      toast({
        title: 'Shops zugewiesen',
        description: `${data.assignedCount} Shop(s) erfolgreich zugewiesen.`,
        variant: 'default'
      });
      setSelectedAdmin('');
      setSelectedShops([]);
      setAssignmentReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler bei Zuweisung',
        description: error.message || 'Unbekannter Fehler aufgetreten.',
        variant: 'destructive'
      });
    }
  });

  // Bulk-Zuweisung Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async (data: { assignments: Array<{ multiShopAdminId: number; shopIds: number[] }> }) => {
      const response = await apiRequest('POST', '/api/superadmin/bulk-assign', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/admins'] });
      toast({
        title: 'Bulk-Zuweisung abgeschlossen',
        description: `${data.totalAssignments} Zuweisungen erfolgreich bearbeitet.`,
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler bei Bulk-Zuweisung',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleAssignShops = () => {
    if (!selectedAdmin || selectedShops.length === 0) {
      toast({
        title: 'Auswahl erforderlich',
        description: 'Bitte wählen Sie einen Admin und mindestens einen Shop aus.',
        variant: 'destructive'
      });
      return;
    }

    if (!assignmentReason.trim()) {
      toast({
        title: 'Begründung erforderlich',
        description: 'Bitte geben Sie eine Begründung für die Zuweisung an.',
        variant: 'destructive'
      });
      return;
    }

    assignShopsMutation.mutate({
      multiShopAdminId: parseInt(selectedAdmin),
      shopIds: selectedShops,
      reason: assignmentReason.trim()
    });
  };

  const handleShopToggle = (shopId: number) => {
    setSelectedShops(prev => 
      prev.includes(shopId) 
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  // Gefilterte Shops basierend auf Suchterm
  const filteredShops = allShops.filter(shop => 
    shop.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Permission Overview Card */}
      {permissionOverview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Permission-Übersicht
            </CardTitle>
            <CardDescription>
              Aktuelle Status der Multi-Shop Berechtigungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-800">
                  {permissionOverview.totalMultiShopAdmins || 0}
                </div>
                <div className="text-xs text-blue-600">Multi-Shop Admins</div>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-800">
                  {permissionOverview.totalPermissions || 0}
                </div>
                <div className="text-xs text-green-600">Aktive Berechtigungen</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-yellow-800">
                  {permissionOverview.pendingRequests || 0}
                </div>
                <div className="text-xs text-yellow-600">Wartende Anfragen</div>
              </div>
              <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-md">
                <Building2 className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-gray-800">
                  {allShops.length || 0}
                </div>
                <div className="text-xs text-gray-600">Gesamt Shops</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shop-Zuweisung Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />
            Shop-Zuweisungen verwalten
          </CardTitle>
          <CardDescription>
            Weisen Sie Multi-Shop Admins Zugriff auf bestimmte Shops zu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Admin-Auswahl */}
          <div className="space-y-2">
            <Label htmlFor="admin-select">Multi-Shop Administrator</Label>
            <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
              <SelectTrigger>
                <SelectValue placeholder="Admin auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {multiShopAdmins.map(admin => (
                  <SelectItem key={admin.id} value={admin.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{admin.username}</span>
                      <Badge variant="secondary" className="ml-2">
                        {admin.accessibleShops.length} Shops
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shop-Suche */}
          <div className="space-y-2">
            <Label>Shops durchsuchen</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Nach Shop-Namen oder Username suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Shop-Auswahl */}
          <div className="space-y-2">
            <Label>Shops auswählen ({selectedShops.length} ausgewählt)</Label>
            <div className="max-h-64 overflow-y-auto border rounded-md p-2">
              {loadingShops ? (
                <div className="text-center py-4 text-gray-500">Lade Shops...</div>
              ) : filteredShops.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchTerm ? 'Keine Shops gefunden' : 'Keine Shops verfügbar'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredShops.map(shop => (
                    <div 
                      key={shop.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        selectedShops.includes(shop.id) 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleShopToggle(shop.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedShops.includes(shop.id)}
                          onChange={() => handleShopToggle(shop.id)}
                          className="rounded border-gray-300"
                        />
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{shop.businessName}</div>
                          <div className="text-xs text-gray-500">@{shop.username}</div>
                        </div>
                      </div>
                      <Badge variant={shop.isActive ? 'default' : 'secondary'}>
                        {shop.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Begründung */}
          <div className="space-y-2">
            <Label htmlFor="reason">Begründung für Zuweisung *</Label>
            <Textarea
              id="reason"
              placeholder="Warum soll dieser Admin Zugriff auf die ausgewählten Shops erhalten?"
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* DSGVO-Hinweis */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">DSGVO-Hinweis</p>
              <p className="text-amber-700">
                Diese Zuweisung löst automatische Benachrichtigungen an die betroffenen Shop-Owner aus. 
                Diese müssen den Zugriff explizit genehmigen, bevor der Multi-Shop Admin Zugriff erhält.
              </p>
            </div>
          </div>

          {/* Aktions-Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleAssignShops}
              disabled={assignShopsMutation.isPending || !selectedAdmin || selectedShops.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {assignShopsMutation.isPending ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Wird zugewiesen...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Shops zuweisen
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAdmin('');
                setSelectedShops([]);
                setAssignmentReason('');
              }}
              disabled={assignShopsMutation.isPending}
            >
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}