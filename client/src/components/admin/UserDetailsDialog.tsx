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
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onToggleActive?: (userId: number) => void;
  onEdit?: (userId: number) => void;
}

type UserResponse = {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  pricingPlan: 'basic' | 'professional' | 'enterprise';
  createdAt?: string;
};

type BusinessSettings = {
  id: number;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
  businessLogo: string | null;
  vatNumber: string;
  companySlogan: string;
  taxRate: number;
  repairLabelPrinterEnabled: boolean;
  userId: number;
};

export function UserDetailsDialog({ open, onClose, userId, onToggleActive, onEdit }: UserDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();

  // Dialog schließen mit Verzögerung für Animationen
  const handleClose = () => {
    onClose();
  };

  // Benutzerdaten abrufen
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery<UserResponse>({
    queryKey: [`/api/admin/users/${userId}`],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiRequest("GET", `/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error(`Fehler beim Laden des Benutzers: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: !!userId && open,
  });
  
  // Unternehmensdetails des Benutzers abrufen
  const { data: businessSettings, isLoading: isLoadingBusiness, error: businessError } = useQuery<BusinessSettings>({
    queryKey: [`/api/admin/users/${userId}/business-settings`],
    queryFn: async () => {
      if (!userId) return null;
      try {
        console.log(`Lade Unternehmensdetails für Benutzer ${userId}`);
        const response = await apiRequest("GET", `/api/admin/users/${userId}/business-settings`);
        
        // Log der Antwort
        console.log(`Antwort-Status:`, response.status, response.statusText);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Es ist okay, wenn keine Business-Settings gefunden wurden
            console.log(`Keine Unternehmensdetails für Benutzer ${userId} gefunden (404)`);
            return null;
          }
          if (response.status === 401) {
            console.log(`Nicht angemeldet (401) beim Laden der Unternehmensdetails für ${userId}`);
            // Bei Authentifizierungsproblemen senden wir zumindest die Benutzer-ID zurück
            return { userId } as any;
          }
          throw new Error(`Fehler beim Laden der Unternehmensdetails: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Unternehmensdetails geladen:`, data);
        return data;
      } catch (error) {
        console.error(`Fehler beim Laden der Unternehmensdetails für Benutzer ${userId}:`, error);
        // Bei allgemeinen Fehlern senden wir zumindest die Benutzer-ID zurück
        return { userId } as any;
      }
    },
    enabled: !!userId && open,
  });

  // Benutzerstatus umschalten (aktivieren/deaktivieren)
  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const currentUser = await apiRequest("GET", `/api/admin/users/${userId}`).then(res => res.json());
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/activate`, { isActive: !currentUser.isActive });
      if (!response.ok) {
        throw new Error(`Fehler beim Ändern des Benutzerstatus: ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Benutzerstatus geändert",
        description: "Der Benutzerstatus wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Ändern des Benutzerstatus",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingUser) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{user.username}</DialogTitle>
              <DialogDescription>{user.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="company">Unternehmen</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Benutzerinformationen</CardTitle>
                <CardDescription>Allgemeine Informationen zum Benutzer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Benutzername</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user.username}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">E-Mail-Adresse</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={user.isActive ? "success" : "destructive"}>
                        {user.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-muted-foreground">Rolle</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={user.isAdmin ? "default" : "outline"}>
                        {user.isAdmin ? "Administrator" : "Benutzer"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-muted-foreground">Preispaket</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <PackageOpen className="h-4 w-4 text-muted-foreground" />
                      <Badge 
                        variant={
                          user.pricingPlan === "enterprise" ? "default" : 
                          user.pricingPlan === "professional" ? "success" : 
                          "outline"
                        }
                      >
                        {user.pricingPlan === "enterprise" ? "Enterprise" : 
                         user.pricingPlan === "professional" ? "Professional" : 
                         "Basic"}
                      </Badge>
                    </div>
                  </div>
                  
                  {user.createdAt && (
                    <div>
                      <Label className="text-muted-foreground">Registriert am</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(new Date(user.createdAt))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Unternehmensdetails</CardTitle>
                <CardDescription>Geschäftsdaten des Benutzers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingBusiness ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : businessSettings ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Unternehmensname</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{businessSettings.businessName}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">E-Mail</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{businessSettings.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-muted-foreground">Telefon</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{businessSettings.phone || '-'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">Website</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span>{businessSettings.website || '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Inhaber</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{businessSettings.ownerFirstName} {businessSettings.ownerLastName}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Adresse</Label>
                      <div className="flex items-start gap-2 mt-1">
                        <Building className="h-4 w-4 text-muted-foreground mt-1" />
                        <span className="whitespace-pre-line">
                          {businessSettings.streetAddress}<br />
                          {businessSettings.zipCode} {businessSettings.city}<br />
                          {businessSettings.country}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-muted-foreground">Steuer-ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>{businessSettings.taxId || '-'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground">USt-IdNr.</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>{businessSettings.vatNumber || '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Firmenslogan</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{businessSettings.companySlogan || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label className="text-muted-foreground">SMTP-Konfiguration</Label>
                      <div className="grid grid-cols-2 gap-4 mt-1">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <span>Host: {businessSettings.smtpHost || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PanelTop className="h-4 w-4 text-muted-foreground" />
                          <span>Port: {businessSettings.smtpPort || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>User: {businessSettings.smtpUser || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Absender: {businessSettings.smtpSenderName || '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="space-y-0.5">
                        <Label>Etikettendrucker aktiviert</Label>
                      </div>
                      <Badge variant={businessSettings.repairLabelPrinterEnabled ? "success" : "outline"}>
                        {businessSettings.repairLabelPrinterEnabled ? "Aktiviert" : "Deaktiviert"}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
                    <p className="text-sm">
                      Keine Unternehmensdetails für diesen Benutzer gefunden.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Benutzereinstellungen</CardTitle>
                <CardDescription>Verwalten Sie die Einstellungen dieses Benutzers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="user-status">Benutzerstatus</Label>
                    <div className="text-sm text-muted-foreground">
                      {user.isActive ? "Benutzer ist aktiv und kann sich anmelden" : "Benutzer ist inaktiv und kann sich nicht anmelden"}
                    </div>
                  </div>
                  <Switch 
                    id="user-status"
                    checked={user.isActive}
                    disabled={user.isAdmin || toggleActiveMutation.isPending}
                    onCheckedChange={() => {
                      if (onToggleActive) {
                        onToggleActive(user.id);
                      } else {
                        toggleActiveMutation.mutate(user.id);
                      }
                    }}
                  />
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex flex-col space-y-2">
                  <Label>Benutzer bearbeiten</Label>
                  <p className="text-sm text-muted-foreground">
                    Bearbeiten Sie die Benutzerdaten wie Benutzername, E-Mail, Rolle und Preispaket.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => {
                      if (onEdit) {
                        onEdit(user.id);
                        handleClose();
                      }
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Benutzer bearbeiten
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
