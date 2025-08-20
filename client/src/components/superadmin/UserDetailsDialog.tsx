import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  MapPin,
  Building,
  Phone,
  Calendar,
  Tag,
  Globe,
  CheckCircle,
  XCircle,
  Shield,
  X,
  Users
} from 'lucide-react';

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onEdit?: (id: number) => void;
  onToggleActive?: (userId: number) => void;
}

interface UserWithBusinessSettings {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  pricingPlan: string | null;
  shopId: number | null;
  createdAt: string;
  trialExpiresAt: string | null;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  // Geschäftsdaten direkt im user-Objekt (aus /api/superadmin/users/:id)
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;  
  companyEmail?: string;
  companyVatNumber?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  streetAddress?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  website?: string;
  taxId?: string;
}

function getUserStatusBadge(isActive: boolean, isAdmin: boolean, isSuperadmin: boolean) {
  if (isSuperadmin) {
    return <Badge variant="destructive" className="flex items-center gap-1"><Shield className="h-3 w-3" />Superadmin</Badge>;
  }
  if (isAdmin) {
    return <Badge variant="secondary" className="flex items-center gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
  }
  if (isActive) {
    return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Aktiv</Badge>;
  }
  return <Badge variant="outline" className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" />Inaktiv</Badge>;
}

export function UserDetailsDialog({ open, onClose, userId, onEdit, onToggleActive }: UserDetailsDialogProps) {
  
  const { data: user, isLoading, error } = useQuery<UserWithBusinessSettings>({
    queryKey: [`/api/superadmin/users/${userId}`],
    enabled: open && !!userId,
  });

  const { data: businessSettings } = useQuery<any>({
    queryKey: [`/api/superadmin/user-business-settings/${userId}`],
    enabled: open && !!userId,
  });

  // Mitarbeiter dieses Shops laden
  const { data: allUsers } = useQuery<any[]>({
    queryKey: ['/api/superadmin/users'],
    enabled: open && !!userId,
  });

  // Mitarbeiter für diesen Shop filtern
  // Alle Benutzer mit gleicher Shop ID (außer dem Shop-Owner selbst)
  const employees = allUsers?.filter(u => 
    u.shopId === user?.shopId && u.id !== user?.id && 
    (u.role === 'employee' || !u.username) // Mitarbeiter oder Benutzer ohne Benutzername
  ) || [];

  const handleClose = () => {
    onClose();
  };

  if (!open || !userId) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Benutzerdetails werden geladen...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fehler beim Laden der Benutzerdetails</DialogTitle>
          </DialogHeader>
          <p className="text-red-600">Die Benutzerdetails konnten nicht geladen werden.</p>
          <Button onClick={handleClose}>Schließen</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // IMMER die businessSettings API als primäre Quelle verwenden!
  // Das businessSettings-Objekt enthält die aktuellsten Daten
  const settings = businessSettings || {
    // Einfacher Fallback wenn API nicht lädt
    businessName: "Wird geladen...",
    streetAddress: "Wird geladen...", 
    phone: "Wird geladen...",
    email: "Wird geladen...",
    website: "Wird geladen...",
    taxId: "Wird geladen...",
    ownerFirstName: "Wird geladen...",
    ownerLastName: "Wird geladen...",
    zipCode: "Wird geladen...",
    city: "Wird geladen...",
    country: "Wird geladen..."
  };
  
  // Debug: Log die empfangenen Daten
  console.log('🔍 UserDetailsDialog Debug:', {
    userId: user.id,
    username: user.username,
    businessSettings_available: !!businessSettings,
    businessSettings_data: businessSettings,
    user_company_data: {
      companyName: user.companyName,
      ownerFirstName: user.ownerFirstName,
      ownerLastName: user.ownerLastName,
      zipCode: user.zipCode,
      city: user.city
    },
    finalSettings: settings
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Benutzerdetails: {user.username}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benutzer-Grundinformationen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Benutzerinformationen
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20">Status:</span>
                    {getUserStatusBadge(user.isActive, user.isAdmin, user.isSuperadmin)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Erstellt: {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: de })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Shop ID: {user.shopId || 'Nicht zugewiesen'}</span>
                  </div>
                  {user.pricingPlan && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Paket: {user.pricingPlan}</span>
                    </div>
                  )}
                  
                  {/* Online Status und Last Login */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    {(() => {
                      const now = new Date();
                      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
                      const isOnline = user.lastLoginAt && new Date(user.lastLoginAt) > fifteenMinutesAgo;
                      
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium">
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>Letzter Login:</strong><br />
                            {user.lastLoginAt 
                              ? format(new Date(user.lastLoginAt), 'dd.MM.yyyy - HH:mm', { locale: de })
                              : 'Noch nie eingeloggt'
                            }
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Mitarbeiter-Bereich (nur für Shop-Owner) */}
              {user.shopId && !user.isAdmin && (
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-yellow-600" />
                      Mitarbeiter ({employees.length})
                    </h3>
                    <MaxEmployeesInput 
                      shopId={user.shopId} 
                      currentValue={settings?.maxEmployees || 2}
                      onUpdate={() => {
                        queryClient.invalidateQueries({ queryKey: [`/api/superadmin/user-business-settings/${userId}`] });
                      }}
                    />
                  </div>
                  {employees.length > 0 ? (
                    <div className="space-y-3">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {employee.username || (
                                  <span className="text-muted-foreground italic">Mitarbeiter</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={employee.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                            >
                              {employee.isActive ? "Aktiv" : "Inaktiv"}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              ID: {employee.id}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Keine Mitarbeiter registriert</p>
                  )}
                </div>
              )}
            </div>

            {/* Geschäftsinformationen */}
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building className="h-4 w-4 text-green-600" />
                Geschäftsinformationen
              </h3>
              
              {settings && Object.keys(settings).length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Geschäftsname:</span>
                    <p className="text-sm">{settings.businessName || "Nicht angegeben"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Vorname:</span>
                      <p className="text-sm">{settings.ownerFirstName || "Nicht angegeben"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Nachname:</span>
                      <p className="text-sm">{settings.ownerLastName || "Nicht angegeben"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Adresse:</span>
                    <p className="text-sm">{settings.streetAddress || "Nicht angegeben"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">PLZ:</span>
                      <p className="text-sm">{settings.zipCode || "Nicht angegeben"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ort:</span>
                      <p className="text-sm">{settings.city || "Nicht angegeben"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Land:</span>
                    <p className="text-sm">{settings.country || "Nicht angegeben"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefon:</span>
                    <p className="text-sm">{settings.phone || "Nicht angegeben"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">UID:</span>
                    <p className="text-sm">{settings.taxId || "Nicht angegeben"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Website:</span>
                    <p className="text-sm">{settings.website || "Nicht angegeben"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Keine Geschäftsinformationen verfügbar</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
            {onEdit && (
              <Button onClick={() => onEdit(user.id)}>
                Bearbeiten
              </Button>
            )}
            {onToggleActive && (
              <Button
                variant={user.isActive ? "destructive" : "default"}
                onClick={() => onToggleActive(user.id)}
              >
                {user.isActive ? "Deaktivieren" : "Aktivieren"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// MaxEmployeesInput-Komponente für Superadmin
interface MaxEmployeesInputProps {
  shopId: number | null;
  currentValue: number;
  onUpdate: () => void;
}

function MaxEmployeesInput({ shopId, currentValue, onUpdate }: MaxEmployeesInputProps) {
  const [value, setValue] = useState(currentValue.toString());
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (maxEmployees: number) => {
      const response = await apiRequest('PATCH', `/api/superadmin/shops/${shopId}/max-employees`, {
        maxEmployees
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolgreich",
        description: "Mitarbeiterlimit wurde aktualisiert",
      });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Mitarbeiterlimits",
        variant: "destructive",
      });
      setValue(currentValue.toString());
    },
  });

  const handleSave = () => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      toast({
        title: "Ungültiger Wert",
        description: "Bitte geben Sie eine Zahl zwischen 0 und 100 ein",
        variant: "destructive",
      });
      setValue(currentValue.toString());
      return;
    }
    updateMutation.mutate(numValue);
  };

  const handleCancel = () => {
    setValue(currentValue.toString());
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{currentValue}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-6 px-2 text-xs"
        >
          Bearbeiten
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 h-8 text-sm"
        type="number"
        min="0"
        max="100"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        autoFocus
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="h-8 px-2 text-xs"
      >
        {updateMutation.isPending ? "..." : "Speichern"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        className="h-8 px-2 text-xs"
      >
        Abbrechen
      </Button>
    </div>
  );
}