import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
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
  X
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
  businessSettings?: {
    businessName: string;
    ownerFirstName: string;
    ownerLastName: string;
    streetAddress: string;
    zipCode: string;
    city: string;
    country: string;
    email: string;
    phone: string;
    taxId: string;
    website: string;
    vatNumber: string;
  };
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

  // Für inaktive Benutzer: Zeige Registrierungsdaten aus der users-Tabelle
  // Für aktive Benutzer: Zeige business_settings
  const settings = businessSettings || user.businessSettings || {};
  
  // Debug: Log die empfangenen Daten
  console.log('🔍 UserDetailsDialog Debug:', {
    isActive: user.isActive,
    businessSettings,
    userBusinessSettings: user.businessSettings,
    finalSettings: settings,
    userId: user.id,
    username: user.username
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
                </div>
              </div>
            </div>

            {/* Geschäftsinformationen */}
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building className="h-4 w-4 text-green-600" />
                Geschäftsinformationen
              </h3>
              {settings && Object.keys(settings).length > 0 ? (
                <div className="space-y-3">
                  {settings.businessName && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Geschäftsname:</span>
                      <p className="text-sm">{settings.businessName}</p>
                    </div>
                  )}
                  {settings.ownerFirstName && settings.ownerLastName && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Inhaber:</span>
                      <p className="text-sm">{settings.ownerFirstName} {settings.ownerLastName}</p>
                    </div>
                  )}
                  {settings.streetAddress && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Adresse:</span>
                      <p className="text-sm">{settings.streetAddress}</p>
                    </div>
                  )}
                  {(settings.zipCode || settings.city) && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ort:</span>
                      <p className="text-sm">{settings.zipCode} {settings.city}</p>
                    </div>
                  )}
                  {settings.country && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Land:</span>
                      <p className="text-sm">{settings.country}</p>
                    </div>
                  )}
                  {settings.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{settings.phone}</span>
                    </div>
                  )}
                  {settings.taxId && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">UID:</span>
                      <p className="text-sm">{settings.taxId}</p>
                    </div>
                  )}
                  {settings.vatNumber && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">USt-IdNr:</span>
                      <p className="text-sm">{settings.vatNumber}</p>
                    </div>
                  )}
                  {settings.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{settings.website}</span>
                    </div>
                  )}
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