import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Clock,
  Tag,
  Euro,
  FileText,
  Package,
  Settings,
  Globe,
  Printer,
  Palette,
  Shield,
  Users,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onEdit?: (id: number) => void;
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
    email: string | null;
    phone: string | null;
    websiteUrl: string | null;
    businessSlogan: string | null;
    vatNumber: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    logoUrl: string | null;
    printLogo: boolean;
    printCompanyInfo: boolean;
    printOwnerInfo: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPassword: string | null;
    smtpSecure: boolean;
    senderEmail: string | null;
    senderName: string | null;
    openingHours: string | null;
  };
}

export function UserDetailsDialog({ open, onClose, userId, onEdit }: UserDetailsDialogProps) {
  const [user, setUser] = useState<UserWithBusinessSettings | null>(null);

  // Dialog schließen mit Verzögerung für Animationen
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setUser(null);
    }, 300);
  };

  // Benutzer und Geschäftseinstellungen abrufen
  const { data: userData } = useQuery<UserWithBusinessSettings>({
    queryKey: ['/api/superadmin/users', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Keine Benutzer-ID');
      const response = await apiRequest('GET', `/api/superadmin/users/${userId}`);
      return response.json();
    },
    enabled: open && userId !== null,
  });

  // Geschäftseinstellungen für den Benutzer abrufen
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/superadmin/user-business-settings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Keine Benutzer-ID');
      const response = await apiRequest('GET', `/api/superadmin/user-business-settings/${userId}`);
      return response.json();
    },
    enabled: open && userId !== null,
  });

  // Benutzer setzen, wenn Daten verfügbar sind
  useEffect(() => {
    if (userData && businessSettings) {
      setUser({
        ...userData,
        businessSettings
      });
    } else if (userData) {
      setUser(userData);
    }
  }, [userData, businessSettings]);

  // Formatiere das Datum im deutschen Format
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
  };

  // Formatiere das Datum und die Uhrzeit
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd. MMMM yyyy, HH:mm', { locale: de });
  };

  // Status-Badge für Benutzer
  const getUserStatusBadge = (isActive: boolean, isAdmin: boolean, isSuperadmin: boolean) => {
    if (isSuperadmin) {
      return <Badge variant="destructive" className="bg-purple-500 hover:bg-purple-600"><Shield className="h-3 w-3 mr-1" />Superadmin</Badge>;
    }
    if (isAdmin) {
      return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white"><Users className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    if (isActive) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aktiv</Badge>;
    }
    return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Inaktiv</Badge>;
  };

  // Paket-Badge
  const getPackageBadge = (pricingPlan: string | null) => {
    const plan = pricingPlan || 'demo';
    const colors = {
      demo: 'bg-gray-500',
      professional: 'bg-blue-500',
      enterprise: 'bg-purple-500'
    };
    const labels = {
      demo: 'Demo',
      professional: 'Professional',
      enterprise: 'Enterprise'
    };
    
    return (
      <Badge className={`${colors[plan as keyof typeof colors] || colors.demo} hover:opacity-80 text-white`}>
        <Package className="h-3 w-3 mr-1" />
        {labels[plan as keyof typeof labels] || plan}
      </Badge>
    );
  };

  if (!user) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Benutzerdetails: {user.username}
          </DialogTitle>
          <DialogDescription>
            Vollständige Übersicht aller Benutzerinformationen und Geschäftseinstellungen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benutzer-Grundinformationen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Benutzerinformationen
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20">Status:</span>
                    {getUserStatusBadge(user.isActive, user.isAdmin, user.isSuperadmin)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20">Paket:</span>
                    {getPackageBadge(user.pricingPlan)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Shop-ID: {user.shopId || 'Nicht zugewiesen'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Registriert: {formatDate(user.createdAt)}</span>
                  </div>
                  {user.trialExpiresAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Trial läuft ab: {formatDateTime(user.trialExpiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Geschäftsinformationen */}
            {user.businessSettings && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    Geschäftsinformationen
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{user.businessSettings.businessName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{user.businessSettings.ownerFirstName} {user.businessSettings.ownerLastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {user.businessSettings.streetAddress}<br />
                        {user.businessSettings.zipCode} {user.businessSettings.city}
                      </span>
                    </div>
                    {user.businessSettings.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{user.businessSettings.phone}</span>
                      </div>
                    )}
                    {user.businessSettings.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{user.businessSettings.email}</span>
                      </div>
                    )}
                    {user.businessSettings.websiteUrl && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{user.businessSettings.websiteUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Weitere Geschäftseinstellungen */}
          {user.businessSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Druckeinstellungen */}
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Printer className="h-4 w-4 text-green-600" />
                  Druckeinstellungen
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Logo drucken:</span>
                    <Badge variant={user.businessSettings.printLogo ? "default" : "secondary"}>
                      {user.businessSettings.printLogo ? "Ja" : "Nein"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Firmeninfo drucken:</span>
                    <Badge variant={user.businessSettings.printCompanyInfo ? "default" : "secondary"}>
                      {user.businessSettings.printCompanyInfo ? "Ja" : "Nein"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Inhaberinfo drucken:</span>
                    <Badge variant={user.businessSettings.printOwnerInfo ? "default" : "secondary"}>
                      {user.businessSettings.printOwnerInfo ? "Ja" : "Nein"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Design & Branding */}
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-600" />
                  Design & Branding
                </h3>
                <div className="space-y-3">
                  {user.businessSettings.businessSlogan && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Slogan:</span>
                      <p className="text-sm italic">"{user.businessSettings.businessSlogan}"</p>
                    </div>
                  )}
                  {user.businessSettings.vatNumber && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">USt-IdNr:</span>
                      <span className="text-sm ml-2">{user.businessSettings.vatNumber}</span>
                    </div>
                  )}
                  {user.businessSettings.primaryColor && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Primärfarbe:</span>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: user.businessSettings.primaryColor }}
                      ></div>
                      <span className="text-sm">{user.businessSettings.primaryColor}</span>
                    </div>
                  )}
                  {user.businessSettings.secondaryColor && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sekundärfarbe:</span>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: user.businessSettings.secondaryColor }}
                      ></div>
                      <span className="text-sm">{user.businessSettings.secondaryColor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* E-Mail-Einstellungen */}
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-600" />
                  E-Mail-Einstellungen
                </h3>
                <div className="space-y-2">
                  {user.businessSettings.smtpHost && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SMTP-Host:</span>
                      <span className="text-sm ml-2">{user.businessSettings.smtpHost}</span>
                    </div>
                  )}
                  {user.businessSettings.smtpPort && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SMTP-Port:</span>
                      <span className="text-sm ml-2">{user.businessSettings.smtpPort}</span>
                    </div>
                  )}
                  {user.businessSettings.senderEmail && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Absender-E-Mail:</span>
                      <span className="text-sm ml-2">{user.businessSettings.senderEmail}</span>
                    </div>
                  )}
                  {user.businessSettings.senderName && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Absender-Name:</span>
                      <span className="text-sm ml-2">{user.businessSettings.senderName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SSL/TLS:</span>
                    <Badge variant={user.businessSettings.smtpSecure ? "default" : "secondary"}>
                      {user.businessSettings.smtpSecure ? "Aktiviert" : "Deaktiviert"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Öffnungszeiten */}
              {user.businessSettings.openingHours && (
                <div className="bg-indigo-50 dark:bg-indigo-950 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    Öffnungszeiten
                  </h3>
                  <div className="text-sm whitespace-pre-line">
                    {user.businessSettings.openingHours}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {onEdit && (
              <Button onClick={() => onEdit(user.id)} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            )}
          </div>
          <Button onClick={handleClose} variant="secondary">
            <X className="h-4 w-4 mr-2" />
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}