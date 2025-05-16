import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, User, BusinessSettings } from "@shared/schema";
import {
  User as UserIcon,
  Building2,
  Mail,
  Phone,
  Package as PackageIcon,
  Calendar,
  Store,
  CircleUserRound,
  BadgeCheck,
  BadgeX,
  Loader2,
  FileCog,
  ShoppingCart,
  ReceiptText,
  Settings,
  Shield,
  Globe,
  Star,
  Pencil,
} from 'lucide-react';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
  onEdit?: (user: User) => void;
  onActivate?: (userId: number) => void;
}

export function UserDetailsDialog({ open, onOpenChange, userId, onEdit, onActivate }: UserDetailsDialogProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  
  // Dialog schließen mit Verzögerung für Animationen
  const handleClose = (openState: boolean) => {
    onOpenChange(openState);
    // Kurze Verzögerung, um Flackern zu vermeiden
    if (!openState) {
      setTimeout(() => {
        setUser(null);
      }, 300);
    }
  };
  
  // Benutzerinformationen abrufen
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/superadmin/users'],
    enabled: open && userId !== null,
  });
  
  // Paketinformationen abrufen
  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[]>({ 
    queryKey: ['/api/superadmin/packages'],
    enabled: open && userId !== null,
  });
  
  // Individuelle Geschäftseinstellungen des Benutzers abrufen
  const fetchUserBusinessSettings = async (shopId: number) => {
    if (!shopId) return;
    
    try {
      const response = await fetch(`/api/superadmin/business-settings/${shopId}`);
      if (response.ok) {
        const data = await response.json();
        setBusinessSettings(data);
      } else {
        throw new Error('Fehler beim Abrufen der Geschäftseinstellungen');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Geschäftseinstellungen:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Geschäftseinstellungen konnten nicht geladen werden.",
      });
    }
  };
  
  // Setze den ausgewählten Benutzer, wenn sich die ID ändert oder die Benutzerdaten geladen werden
  useEffect(() => {
    if (open && userId && users) {
      const selectedUser = users.find(u => u.id === userId);
      if (selectedUser) {
        setUser(selectedUser);
        
        // Geschäftseinstellungen abrufen, wenn ein Shop vorhanden ist
        if (selectedUser.shopId) {
          fetchUserBusinessSettings(selectedUser.shopId);
        } else {
          setBusinessSettings(null);
        }
      }
    }
  }, [open, userId, users]);
  
  // Formatiere das Datum im deutschen Format
  const formatDate = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return format(date, 'dd. MMMM yyyy', { locale: de });
  };
  
  if (!open) return null;
  
  if (isLoadingUsers || !user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Benutzerdetails
            </DialogTitle>
            <DialogDescription>
              Lade Benutzerinformationen...
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Skeleton className="w-full h-64" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {user.isAdmin ? <Shield className="h-5 w-5 text-blue-500" /> : <UserIcon className="h-5 w-5" />}
            {user.username}
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zum Benutzer und Geschäftsangaben
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full mt-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-3 mb-4">
            <TabsTrigger value="details">Benutzerdetails</TabsTrigger>
            <TabsTrigger value="business">Geschäftsangaben</TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Allgemeine Benutzerinformationen */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Allgemeine Informationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <UserIcon className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">Benutzername</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">E-Mail-Adresse</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Store className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{user.shopId || 'Kein Shop zugewiesen'}</p>
                      <p className="text-sm text-muted-foreground">Shop-ID</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatDate(user.createdAt)}</p>
                      <p className="text-sm text-muted-foreground">Erstellungsdatum</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Status und Rollen */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Status und Berechtigungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <CircleUserRound className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {user.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m9 12 2 2 4-4"></path></svg> Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg> Inaktiv
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Aktivierungsstatus</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {user.isAdmin ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m9 12 2 2 4-4"></path></svg> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <CircleUserRound className="h-3 w-3 mr-1" /> Benutzer
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Benutzerrolle</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <PackageIcon className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {user.packageId ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            <PackageIcon className="h-3 w-3 mr-1" />
                            {isLoadingPackages 
                              ? 'Lade...' 
                              : packages?.find(p => p.id === user.packageId)?.name || `Paket ${user.packageId}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                            Kein Paket
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Abonniertes Paket</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="business" className="space-y-6">
            {user.companyName || user.companyAddress || user.companyPhone || user.companyEmail || businessSettings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Firma und Kontakt */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Firmeninformationen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.companyName || 'Nicht angegeben'}</p>
                        <p className="text-sm text-muted-foreground">Firmenname</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Store className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium whitespace-pre-line">{user.companyAddress || 'Nicht angegeben'}</p>
                        <p className="text-sm text-muted-foreground">Firmenadresse</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <ReceiptText className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.companyVatNumber || 'Nicht angegeben'}</p>
                        <p className="text-sm text-muted-foreground">USt-IdNr.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Geschäftseinstellungen */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Kontaktdaten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.companyPhone || 'Nicht angegeben'}</p>
                        <p className="text-sm text-muted-foreground">Telefonnummer</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.companyEmail || 'Nicht angegeben'}</p>
                        <p className="text-sm text-muted-foreground">Firmen-E-Mail</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Weitere Geschäftseinstellungen */}
                {businessSettings && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Weitere Geschäftseinstellungen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                          <Settings className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{businessSettings.companySlogan || 'Nicht angegeben'}</p>
                            <p className="text-sm text-muted-foreground">Firmenslogan</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <FileCog className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{businessSettings.vatNumber || 'Nicht angegeben'}</p>
                            <p className="text-sm text-muted-foreground">USt-IdNr.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{businessSettings.website || 'Nicht angegeben'}</p>
                            <p className="text-sm text-muted-foreground">Webseite</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <Star className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{businessSettings.reviewLink || 'Nicht angegeben'}</p>
                            <p className="text-sm text-muted-foreground">Bewertungslink</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/60" />
                  <p className="mt-4 text-lg font-medium">Keine Geschäftsangaben vorhanden</p>
                  <p className="text-muted-foreground mt-1">Für diesen Benutzer wurden noch keine Geschäftsangaben hinterlegt.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Benutzerstatistiken</CardTitle>
                <CardDescription>Übersicht über die Aktivitäten des Benutzers</CardDescription>
              </CardHeader>
              <CardContent className="py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      <span>Gesamtzahl der Reparaturen</span>
                    </div>
                    <span className="font-medium">Wird geladen...</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center">
                      <BadgeCheck className="h-4 w-4 mr-2" />
                      <span>Letzte Anmeldung</span>
                    </div>
                    <span className="font-medium">Wird geladen...</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Mitglied seit</span>
                    </div>
                    <span className="font-medium">{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Aktionen */}
        <DialogFooter className="pt-6 border-t mt-6">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(user)}
                className="flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg> Bearbeiten
              </Button>
            )}
            
            {onActivate && (
              <Button
                variant={user.isActive ? "outline" : "default"}
                onClick={() => onActivate(user.id)}
                className="flex items-center gap-1"
              >
                {user.isActive ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg> Deaktivieren
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m9 12 2 2 4-4"></path></svg> Aktivieren
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="ml-auto"
            >
              Schließen
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}