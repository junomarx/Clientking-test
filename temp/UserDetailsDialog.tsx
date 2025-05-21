import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';

import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Pencil,
  Calendar,
  User,
  Mail,
  Settings,
  Shield,
  PackageOpen,
  ThumbsUp,
  Clock,
  Building,
  Phone,
  Globe,
  ImageIcon,
  CreditCard,
  Printer,
  FileText,
  Percent,
  MonitorSmartphone,
  Terminal,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Feature, FeatureOverrides } from "@/lib/permissions";

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onToggleActive?: (userId: number) => void;
  onEdit?: (userId: number) => void;
  onDelete?: (userId: number) => void;
}

type UserResponse = {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  pricingPlan: 'basic' | 'professional' | 'enterprise';
  featureOverrides?: string; // JSON string of feature overrides
  createdAt?: string;
};

type BusinessSettings = {
  id: number;
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  taxId?: string;
  vatNumber?: string;
  companySlogan?: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  logoImage?: string;
  colorTheme?: string;
  receiptWidth?: string;
  smtpSenderName?: string;
  smtpHost?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpPort?: string;
  reviewLink?: string;
  repairLabelPrinterEnabled?: boolean;
  userId: number;
  updatedAt?: string;
};

/**
 * Dialog zur Anzeige und Bearbeitung von Benutzerdetails im Administrationsbereich
 * Enthält zusätzlich Funktionen zum Aktivieren/Deaktivieren und Löschen von Benutzern
 */
export function UserDetailsDialog({ open, onClose, userId, onToggleActive, onEdit, onDelete }: UserDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const { data: user, isLoading, isError, error } = useQuery<UserResponse, Error>({
    queryKey: [`/api/superadmin/users/${userId}`],
    queryFn: async () => {
      if (!userId) return null;
      const res = await apiRequest('GET', `/api/superadmin/users/${userId}`);
      return res.json();
    },
    enabled: !!userId && open,
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Laden der Benutzerdaten",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: businessSettings, isLoading: isLoadingSettings } = useQuery<BusinessSettings, Error>({
    queryKey: [`/api/superadmin/business-settings/${userId}`],
    queryFn: async () => {
      if (!userId) return null;
      const res = await apiRequest('GET', `/api/superadmin/business-settings/${userId}`);
      return res.json();
    },
    enabled: !!userId && open,
    onError: (error: Error) => {
      // Hier keinen Fehler ausgeben, da der Benutzer möglicherweise keine Geschäftseinstellungen hat
      console.log("Keine Geschäftseinstellungen gefunden:", error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const action = user?.isActive ? 'deactivate' : 'activate';
      const res = await apiRequest('POST', `/api/superadmin/users/${userId}/${action}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/superadmin/users/${userId}`] });
      toast({
        title: user?.isActive ? "Benutzer deaktiviert" : "Benutzer aktiviert",
        description: `Der Benutzer wurde erfolgreich ${user?.isActive ? 'deaktiviert' : 'aktiviert'}.`,
      });
      if (onToggleActive && userId) {
        onToggleActive(userId);
      }
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      setIsDeleting(true);
      const res = await apiRequest('DELETE', `/api/superadmin/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Benutzers');
      }
      return true;
    },
    onSuccess: () => {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
      handleClose();
      if (onDelete && userId) {
        onDelete(userId);
      }
    },
    onError: (error: any) => {
      setIsDeleting(false);
      toast({
        title: "Fehler beim Löschen des Benutzers",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    onClose();
  };

  // Render Zustände basierend auf dem Ladezustand
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex justify-center my-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fehler</DialogTitle>
            <DialogDescription>
              Beim Laden der Benutzerdaten ist ein Fehler aufgetreten: {error?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Hauptdialog für Benutzerdetails
  return (
    <>
      {/* Bestätigungsdialog für Benutzerlöschung */}
      {showDeleteDialog && user && (
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => {
            if (userId) deleteUserMutation.mutate(userId);
          }}
          title="Benutzer löschen"
          description={`Sind Sie sicher, dass Sie den Benutzer ${user.username} löschen möchten? Alle zugehörigen Daten werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`}
          isDeleting={isDeleting}
          itemName="Benutzer"
        />
      )}
      
      {/* Hauptdialog für Benutzerdetails */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {user && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{user.username}</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      {user.isAdmin ? (
                        <Badge className="mr-2">Admin</Badge>
                      ) : (
                        <Badge variant="outline" className="mr-2">Benutzer</Badge>
                      )}
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-600">Aktiv</Badge>
                      ) : (
                        <Badge variant="destructive">Inaktiv</Badge>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="details">Benutzerdetails</TabsTrigger>
                  <TabsTrigger value="business">Geschäftsdaten</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        Benutzerinformationen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Label>E-Mail</Label>
                        </div>
                        <div className="text-sm">{user.email}</div>
                      </div>

                      {user.createdAt && (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Label>Registrierungsdatum</Label>
                          </div>
                          <div className="text-sm">{formatDate(user.createdAt)}</div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <PackageOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Label>Paket</Label>
                        </div>
                        <div className="text-sm capitalize">{user.pricingPlan}</div>
                      </div>

                      {user.featureOverrides && (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Label>Funktionsüberschreibungen</Label>
                          </div>
                          <div className="grid grid-cols-1 gap-2 mt-2">
                            {Object.entries(JSON.parse(user.featureOverrides || '{}')).map(([feature, enabled]) => (
                              <div key={feature} className="flex items-center justify-between rounded border p-2">
                                <span className="text-sm font-medium">{feature}</span>
                                <Badge variant={enabled ? "default" : "outline"}>
                                  {enabled ? "Aktiviert" : "Deaktiviert"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="business">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Building className="mr-2 h-5 w-5" />
                        Geschäftsinformationen
                      </CardTitle>
                      <CardDescription>
                        {isLoadingSettings ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : !businessSettings ? (
                          "Keine Geschäftsdaten vorhanden"
                        ) : null}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {businessSettings && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                              <Label>Geschäftsname</Label>
                            </div>
                            <div className="text-sm">{businessSettings.businessName}</div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4 text-muted-foreground" />
                              <Label>Inhaber</Label>
                            </div>
                            <div className="text-sm">
                              {businessSettings.ownerFirstName} {businessSettings.ownerLastName}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                              <Label>Kontakt</Label>
                            </div>
                            <div className="text-sm grid gap-1">
                              {businessSettings.email && (
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {businessSettings.email}
                                </div>
                              )}
                              {businessSettings.phone && (
                                <div className="flex items-center">
                                  <Phone className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {businessSettings.phone}
                                </div>
                              )}
                              {businessSettings.website && (
                                <div className="flex items-center">
                                  <Globe className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {businessSettings.website}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                              <Label>Adresse</Label>
                            </div>
                            <div className="text-sm">
                              {businessSettings.streetAddress}
                              <br />
                              {businessSettings.zipCode} {businessSettings.city}
                              <br />
                              {businessSettings.country}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-end">
                      <Button variant="outline" onClick={() => onEdit?.(userId || 0)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Benutzer bearbeiten
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="gap-2 flex-col sm:flex-row">
                <Button variant="outline" onClick={handleClose}>
                  Schließen
                </Button>
                {onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => onEdit(user.id)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                )}
                {onToggleActive && (
                  <Button
                    variant={user.isActive ? "outline" : "default"}
                    onClick={() => toggleActiveMutation.mutate(user.id)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {toggleActiveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-4 w-4 mr-2" />
                    )}
                    {user.isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}