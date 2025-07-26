import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SimpleUserDetailsDialog } from '../admin/SimpleUserDetailsDialog';
import { UserDetailsDialog } from './UserDetailsDialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOnlineStatus } from '@/hooks/use-online-status';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CircleUserRound,
  UserCog,
  ShieldCheck,
  Lock,
  Building2,
  Mail,
  Phone,
  BadgeCheck,
  BadgeX,
  Circle,
  Pencil,
  Store,
  Search,
  Info,
  FileText,
  RefreshCw,
  Loader2
} from 'lucide-react';

// Benutzer-Typ ohne Passwort
interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  role: string | null;
  shopId: number | null;
  companyName: string | null;
  companyAddress: string | null;
  companyVatNumber: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  packageId: number | null;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  createdAt: string;
}

// Erweiterter Benutzertyp für Formulareingaben
interface UserFormData extends Partial<User> {
  password?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  streetAddress?: string;
  zipCode?: string;
  city?: string;
  country?: string;
}



interface SuperadminUsersTabProps {
  initialSelectedUserId?: number | null;
}

export default function SuperadminUsersTab({ initialSelectedUserId }: SuperadminUsersTabProps = {}) {
  const { toast } = useToast();
  const { isUserOnline: isOnlineViaWebSocket, onlineUsers, isConnected } = useOnlineStatus();

  // Fallback Online-Status-Erkennung für wenn WebSocket nicht verfügbar ist
  const isUserOnlineFallback = (lastLoginAt: string | null, lastLogoutAt: string | null) => {
    if (!lastLoginAt) return false;
    
    const loginTime = new Date(lastLoginAt);
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    
    // Wenn es einen Logout-Zeitstempel gibt
    if (lastLogoutAt) {
      const logoutTime = new Date(lastLogoutAt);
      
      // Wenn der Logout nach dem Login war, ist der Benutzer definitiv offline
      if (logoutTime > loginTime) {
        return false;
      }
    }
    
    // Wenn kein Logout nach dem Login erfolgte, prüfe ob Login recent genug ist
    return loginTime > fifteenMinutesAgo;
  };

  // Backend-Online-Status abrufen
  const { data: backendOnlineStatus } = useQuery({
    queryKey: ['/api/online-status'],
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
  });

  // Hybride Online-Status-Funktion - kombiniert Backend-API und WebSocket
  const isUserOnline = (userId: number, lastLoginAt: string | null, lastLogoutAt: string | null) => {
    // Primär: Backend-API-Status (kombiniert WebSocket + kürzliche Aktivität)
    if (backendOnlineStatus?.onlineUsers) {
      return backendOnlineStatus.onlineUsers.includes(userId);
    }
    
    // Sekundär: WebSocket-basierter Status wenn verbunden
    if (isConnected) {
      return isOnlineViaWebSocket(userId);
    }
    
    // Fallback: Zeitstempel-basierte Logik
    return isUserOnlineFallback(lastLoginAt, lastLogoutAt);
  };
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialSelectedUserId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); // Anzahl Benutzer pro Seite

  // Benutzer abrufen
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<User[]>({ 
    queryKey: ["/api/superadmin/users"],
  });
  
  // Initialer User-Details-Dialog, wenn initialSelectedUserId gesetzt ist
  useEffect(() => {
    if (initialSelectedUserId && users) {
      const userToShow = users.find(user => user.id === initialSelectedUserId);
      if (userToShow) {
        setSelectedUserId(initialSelectedUserId);
        setIsUserDetailsDialogOpen(true); // Verwende das neue Dialog
      }
    }
  }, [initialSelectedUserId, users]);
  
  // Event-Listener für die Kommunikation vom Dashboard
  useEffect(() => {
    const handleShowUserDetails = (event: CustomEvent) => {
      if (event.detail && event.detail.userId) {
        // Bei vorhandenen Benutzerdaten den Dialog öffnen
        if (users) {
          const userToShow = users.find(user => user.id === event.detail.userId);
          if (userToShow) {
            setSelectedUserId(event.detail.userId);
            setIsUserDetailsDialogOpen(true);
          }
        }
      }
    };
    
    // Event-Listener registrieren
    document.addEventListener('showUserDetails', handleShowUserDetails as EventListener);
    
    // Cleanup beim Unmount
    return () => {
      document.removeEventListener('showUserDetails', handleShowUserDetails as EventListener);
    };
  }, [users]);
  
  // Benutzer filtern und sortieren
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    // Filtere Mitarbeiter heraus - nur Shop-Owner und Admins anzeigen
    const ownersAndAdmins = users.filter(user => user.role !== 'employee');
    
    // Filtere nach Suchbegriff
    const filtered = searchQuery 
      ? ownersAndAdmins.filter(user => 
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.companyName && user.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          user.id.toString().includes(searchQuery))
      : ownersAndAdmins;
    
    // Sortiere nach letztem Login (neueste zuerst, dann nach Benutzername)
    return [...filtered].sort((a, b) => {
      // Benutzer ohne Login kommen nach hinten
      if (!a.lastLoginAt && !b.lastLoginAt) {
        return a.username.localeCompare(b.username);
      }
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      
      // Sortiere nach letztem Login (neueste zuerst)
      const loginA = new Date(a.lastLoginAt).getTime();
      const loginB = new Date(b.lastLoginAt).getTime();
      
      if (loginA !== loginB) {
        return loginB - loginA; // Neueste zuerst
      }
      
      // Bei gleichem Login-Datum nach Benutzername sortieren
      return a.username.localeCompare(b.username);
    });
  }, [users, searchQuery]);

  // Pagination-Logik
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Seite zurücksetzen wenn Suche geändert wird
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);



  // Mutation zum Aktivieren/Deaktivieren eines Benutzers
  const toggleActivationMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Erst prüfen, ob der Benutzer aktiv ist
      const usersData = await queryClient.ensureQueryData({
        queryKey: ["/api/superadmin/users"]
      });
      const user = usersData?.find((u: any) => u.id === userId);
      
      if (user?.isActive) {
        // Benutzer deaktivieren
        const response = await apiRequest(
          "POST",
          `/api/superadmin/users/${userId}/deactivate`
        );
        return await response.json();
      } else {
        // Benutzer aktivieren
        const response = await apiRequest(
          "POST",
          `/api/superadmin/users/${userId}/activate`
        );
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Aktivierungsstatus des Benutzers wurde geändert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Aktivierung konnte nicht geändert werden: ${error.message}`,
      });
    },
  });

  // Mutation zum Aktualisieren eines Benutzers
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: UserFormData }) => {
      // 1. Benutzer-Stammdaten aktualisieren
      const response = await apiRequest(
        "PATCH",
        `/api/superadmin/users/${userId}`,
        {
          email: data.email,
          isAdmin: data.isAdmin,
          packageId: data.packageId,
          shopId: data.shopId,
          companyName: data.companyName,
          companyAddress: data.companyAddress,
          companyVatNumber: data.companyVatNumber,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          password: data.password,
        }
      );
      const updatedUser = await response.json();
      
      // 2. Geschäftseinstellungen aktualisieren, sofern zusätzliche Daten vorhanden sind
      if (data.ownerFirstName || data.ownerLastName || data.streetAddress || 
          data.zipCode || data.city || data.country) {
        
        try {
          // Nur die Geschäftseinstellungs-relevanten Felder senden
          const businessSettings = {
            ownerFirstName: data.ownerFirstName,
            ownerLastName: data.ownerLastName,
            streetAddress: data.streetAddress || data.companyAddress,
            zipCode: data.zipCode,
            city: data.city,
            country: data.country,
            businessName: data.companyName,
            email: data.companyEmail,
            phone: data.companyPhone,
            vatNumber: data.companyVatNumber,
          };
          
          const businessSettingsResponse = await apiRequest(
            "PATCH",
            `/api/superadmin/user-business-settings/${userId}`,
            businessSettings
          );
          
          if (!businessSettingsResponse.ok) {
            console.warn("Benutzer konnte aktualisiert werden, aber die Geschäftseinstellungen nicht.", 
                        await businessSettingsResponse.text());
          }
        } catch (error) {
          console.error("Fehler beim Aktualisieren der Geschäftseinstellungen:", error);
          // Hauptoperation war erfolgreich, also keine Exception werfen
        }
      }
      
      return updatedUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Benutzer aktualisiert",
        description: "Die Benutzerinformationen wurden erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Benutzer konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });



  // Mutation zum Aktualisieren des Online-Status aller Benutzer
  const refreshStatusMutation = useMutation({
    mutationFn: async () => {
      // Einfach die Benutzerdaten neu laden, um aktuelle lastLoginAt-Werte zu erhalten
      await queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Status aktualisiert",
        description: "Der Online-Status aller Benutzer wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler", 
        description: `Status konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });

  // Mutation zum Löschen eines Benutzers
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Zeige Toast-Nachricht, dass der Löschvorgang gestartet wurde
      toast({
        title: "Löschvorgang gestartet",
        description: "Der Benutzer wird gelöscht. Dieser Vorgang kann einige Momente dauern...",
      });
      
      await apiRequest("DELETE", `/api/superadmin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Benutzer konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });

  // State für das Bearbeitungsformular
  const [editForm, setEditForm] = useState<UserFormData>({});

  // Benutzer zur Bearbeitung auswählen
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    
    // Geschäftseinstellungen für diesen Benutzer abrufen
    const fetchUserBusinessSettings = async (userId: number) => {
      try {
        const response = await fetch(`/api/superadmin/user-business-settings/${userId}`);
        if (response.ok) {
          const businessSettings = await response.json();
          console.log("Business settings geladen:", businessSettings);
          
          // Formular mit Benutzerdaten und Geschäftseinstellungen füllen
          setEditForm({
            isAdmin: user.isAdmin,
            shopId: user.shopId,
            email: user.email,
            companyName: user.companyName || businessSettings?.businessName,
            companyAddress: user.companyAddress || businessSettings?.streetAddress,
            companyVatNumber: user.companyVatNumber || businessSettings?.vatNumber,
            companyPhone: user.companyPhone || businessSettings?.phone,
            companyEmail: user.companyEmail || businessSettings?.email,
            
            // Zusätzliche Felder aus den Geschäftseinstellungen
            ownerFirstName: businessSettings?.ownerFirstName,
            ownerLastName: businessSettings?.ownerLastName,
            streetAddress: businessSettings?.streetAddress,
            zipCode: businessSettings?.zipCode,
            city: businessSettings?.city,
            country: businessSettings?.country,
          });
        } else {
          // Kein Fehler, nur Formular mit Benutzerdaten füllen
          setEditForm({
            isAdmin: user.isAdmin,
            shopId: user.shopId,
            email: user.email,
            companyName: user.companyName,
            companyAddress: user.companyAddress,
            companyVatNumber: user.companyVatNumber,
            companyPhone: user.companyPhone,
            companyEmail: user.companyEmail,
          });
        }
      } catch (error) {
        console.error("Fehler beim Abrufen der Geschäftseinstellungen:", error);
        
        // Im Fehlerfall nur Benutzerdaten anzeigen
        setEditForm({
          isAdmin: user.isAdmin,
          shopId: user.shopId,
          email: user.email,
          companyName: user.companyName,
          companyAddress: user.companyAddress,
          companyVatNumber: user.companyVatNumber,
          companyPhone: user.companyPhone,
          companyEmail: user.companyEmail,
        });
      }
    };
    
    // Erst Benutzer setzen, dann Geschäftseinstellungen laden
    if (user && user.id) {
      console.log("Lade Geschäftseinstellungen für Benutzer ID:", user.id);
      fetchUserBusinessSettings(user.id);
    } else {
      console.error("Keine gültige Benutzer-ID gefunden:", user);
      // Trotzdem Formular mit verfügbaren Daten füllen
      setEditForm({
        isAdmin: user.isAdmin,
        packageId: user.packageId,
        shopId: user.shopId,
        email: user.email,
        companyName: user.companyName,
        companyAddress: user.companyAddress,
        companyVatNumber: user.companyVatNumber,
        companyPhone: user.companyPhone,
        companyEmail: user.companyEmail,
      });
    }
    setIsEditDialogOpen(true);
  };
  
  // Benutzerdetails anzeigen
  const handleShowUserDetails = (userId: number) => {
    setSelectedUserId(userId);
    setIsDetailsDialogOpen(true);
  };

  // Benutzerdaten aktualisieren
  const handleUpdateUser = () => {
    if (selectedUser && selectedUser.id) {
      console.log("Aktualisiere Benutzer:", selectedUser.id, editForm);
      updateUserMutation.mutate({ userId: selectedUser.id, data: editForm });
    } else {
      console.error("Keine gültige Benutzer-ID gefunden:", selectedUser);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Keine gültige Benutzer-ID gefunden. Bitte versuchen Sie es erneut.",
      });
    }
  };

  // Benutzer löschen
  const handleDeleteUser = (userId: number) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (usersError) {
    toast({
      variant: "destructive",
      title: "Fehler beim Laden der Benutzer",
      description: usersError.message,
    });
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Benutzerverwaltung</h1>
        <p className="text-sm md:text-base text-muted-foreground">Verwalten Sie alle Benutzer der Plattform</p>
      </div>
      
      {isLoadingUsers ? (
        <Skeleton className="w-full h-96" />
      ) : users ? (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Alle Benutzer</CardTitle>
              <CardDescription>
                {searchQuery 
                  ? `${filteredUsers.length} von ${users.length} Benutzern gefunden` 
                  : `Insgesamt ${users.length} Benutzer im System`}
                {totalPages > 1 && (
                  <span className="text-muted-foreground ml-2">
                    • Seite {currentPage} von {totalPages}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* WebSocket-Verbindungsstatus */}
              <div className="flex items-center gap-2 text-sm">
                <Circle 
                  className={`h-2 w-2 ${
                    isConnected 
                      ? 'fill-green-500 text-green-500' 
                      : 'fill-yellow-500 text-yellow-500'
                  }`} 
                />
                <span className="text-muted-foreground">
                  {isConnected ? 'Live-Status aktiv' : 'Fallback-Modus'}
                </span>
              </div>
              
              <Button
                onClick={() => refreshStatusMutation.mutate()}
                disabled={refreshStatusMutation.isPending}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                {refreshStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aktualisiere...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Status aktualisieren
                  </>
                )}
              </Button>
              <div className="relative w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Suche nach Name, Firma..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop-Tabelle (nur auf größeren Bildschirmen) */}
            <div className="hidden md:block overflow-x-auto -mx-6 px-6">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">ID</TableHead>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead className="w-10">Shop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Status Online</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setIsUserDetailsDialogOpen(true);
                      }}
                    >
                      <TableCell>{user.id}</TableCell>
                      <TableCell>
                        {user.username || (
                          <span className="text-muted-foreground italic">
                            {user.role === 'employee' ? 'Mitarbeiter' : 'Kein Benutzername'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.shopId || '-'}</TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                            <BadgeCheck className="h-3 w-3 mr-1" /> Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
                            <BadgeX className="h-3 w-3 mr-1" /> Inaktiv
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="secondary">
                            <UserCog className="h-3 w-3 mr-1" /> Admin
                          </Badge>
                        ) : user.role === 'employee' ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700">
                            <CircleUserRound className="h-3 w-3 mr-1" /> Mitarbeiter
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <CircleUserRound className="h-3 w-3 mr-1" /> Shop-Owner
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Circle 
                            className={`h-2 w-2 mr-2 ${
                              isUserOnline(user.id, user.lastLoginAt, user.lastLogoutAt) 
                                ? 'fill-green-500 text-green-500' 
                                : 'fill-red-500 text-red-500'
                            }`} 
                          />
                          <span className="text-sm">
                            {isUserOnline(user.id, user.lastLoginAt, user.lastLogoutAt) ? 'Online' : 'Offline'}
                          </span>
                          {isConnected && (
                            <span className="text-xs text-muted-foreground ml-1">(Live)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id);
                            }}
                          >
                            Löschen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile-Karten (nur auf kleinen Bildschirmen) */}
            <div className="md:hidden space-y-4">
              {currentUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setIsUserDetailsDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-lg">
                        {user.username || (
                          <span className="text-muted-foreground italic">
                            {user.role === 'employee' ? 'Mitarbeiter' : 'Kein Benutzername'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditUser(user);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID:</span> {user.id}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Shop:</span> {user.shopId || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Erstellt:</span> {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {user.isActive ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        <BadgeCheck className="h-3 w-3 mr-1" /> Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-700">
                        <BadgeX className="h-3 w-3 mr-1" /> Inaktiv
                      </Badge>
                    )}
                    
                    {user.isAdmin ? (
                      <Badge variant="secondary">
                        <UserCog className="h-3 w-3 mr-1" /> Admin
                      </Badge>
                    ) : user.role === 'employee' ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        <CircleUserRound className="h-3 w-3 mr-1" /> Mitarbeiter
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <CircleUserRound className="h-3 w-3 mr-1" /> Shop-Owner
                      </Badge>
                    )}
                    
                    <Badge 
                      variant="outline" 
                      className={`${
                        isUserOnline(user.id, user.lastLoginAt, user.lastLogoutAt) 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <Circle 
                        className={`h-3 w-3 mr-1 ${
                          isUserOnline(user.id, user.lastLoginAt, user.lastLogoutAt) 
                            ? 'fill-green-500 text-green-500' 
                            : 'fill-red-500 text-red-500'
                        }`} 
                      />
                      {isUserOnline(user.id, user.lastLoginAt, user.lastLogoutAt) ? 'Online' : 'Offline'}
                      {isConnected && (
                        <span className="text-xs ml-1">(Live)</span>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteUser(user.id)}
                      className="w-full"
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <div className="text-sm text-muted-foreground">
                Zeige {startIndex + 1}-{Math.min(endIndex, totalUsers)} von {totalUsers} Benutzern
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Zurück
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* Erste Seite */}
                  {currentPage > 3 && (
                    <>
                      <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                      >
                        1
                      </Button>
                      {currentPage > 4 && <span className="px-2">...</span>}
                    </>
                  )}
                  
                  {/* Seiten um die aktuelle Seite */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {/* Letzte Seite */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Weiter
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      ) : (
        <p>Keine Benutzerdaten verfügbar</p>
      )}
      
      {/* Benutzer-Bearbeitungsdialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Benutzer bearbeiten: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen für {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="settings" className="w-full mt-4">
            <TabsList className="w-full grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-0">
              <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
              <TabsTrigger value="activity">Aktivität</TabsTrigger>
              <TabsTrigger value="company">Unternehmensdaten</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label className="text-right col-span-1">E-Mail</Label>
                  <Input
                    id="email"
                    className="col-span-3"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="E-Mail-Adresse"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label className="sm:text-right">Shop ID</Label>
                  <Input
                    id="shopId"
                    className="col-span-1 sm:col-span-3"
                    type="number"
                    value={editForm.shopId?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, shopId: parseInt(e.target.value) || null })}
                    placeholder="Shop ID"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label className="sm:text-right">Passwort zurücksetzen</Label>
                  <div className="col-span-1 sm:col-span-3">
                    <Input
                      id="password"
                      type="password"
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Neues Passwort (leer lassen, um nicht zu ändern)"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Administrator</Label>
                  <div className="col-span-3 flex items-center">
                    <Switch
                      checked={!!editForm.isAdmin}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, isAdmin: checked })}
                    />
                    <span className="ml-2">
                      {editForm.isAdmin ? 'Administrator-Rechte aktiviert' : 'Keine Administrator-Rechte'}
                    </span>
                  </div>
                </div>

              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                {/* Benutzeraktivität */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Benutzeraktivität</h3>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Status</Label>
                    <div className="col-span-3 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isUserOnline(selectedUser?.lastLoginAt || null) ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={isUserOnline(selectedUser?.lastLoginAt || null) ? 'text-green-600' : 'text-red-600'}>
                        {isUserOnline(selectedUser?.lastLoginAt || null) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">Letzte Anmeldung</Label>
                    <div className="col-span-3">
                      {selectedUser?.lastLoginAt ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            {new Date(selectedUser.lastLoginAt).toLocaleDateString('de-DE', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(selectedUser.lastLoginAt).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Noch nie angemeldet</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">Registriert seit</Label>
                    <div className="col-span-3">
                      <div className="text-sm">
                        {new Date(selectedUser?.createdAt || '').toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="company" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                {/* Persönliche Daten des Eigentümers */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Inhaber-Daten</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Vorname</Label>
                      <Input
                        id="ownerFirstName"
                        className="col-span-3"
                        value={editForm.ownerFirstName || ''}
                        onChange={(e) => setEditForm({ ...editForm, ownerFirstName: e.target.value })}
                        placeholder="Vorname des Inhabers"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Nachname</Label>
                      <Input
                        id="ownerLastName"
                        className="col-span-3"
                        value={editForm.ownerLastName || ''}
                        onChange={(e) => setEditForm({ ...editForm, ownerLastName: e.target.value })}
                        placeholder="Nachname des Inhabers"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Firmeninformationen */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Firmeninformationen</h3>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Firmenname</Label>
                    <Input
                      id="companyName"
                      className="col-span-3"
                      value={editForm.companyName || ''}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      placeholder="Firmenname"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">USt-IdNr.</Label>
                    <Input
                      id="companyVatNumber"
                      className="col-span-3"
                      value={editForm.companyVatNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, companyVatNumber: e.target.value })}
                      placeholder="USt-IdNr."
                    />
                  </div>
                </div>
                
                {/* Adressinformationen */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Adressinformationen</h3>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Straße & Nr.</Label>
                    <Input
                      id="streetAddress"
                      className="col-span-3"
                      value={editForm.streetAddress || editForm.companyAddress || ''}
                      onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                      placeholder="Straße und Hausnummer"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">PLZ</Label>
                      <Input
                        id="zipCode"
                        className="col-span-3"
                        value={editForm.zipCode || ''}
                        onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                        placeholder="Postleitzahl"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Ort</Label>
                      <Input
                        id="city"
                        className="col-span-3"
                        value={editForm.city || ''}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="Ort"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">Land</Label>
                    <Input
                      id="country"
                      className="col-span-3"
                      value={editForm.country || 'Österreich'}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      placeholder="Land"
                    />
                  </div>
                </div>
                
                {/* Kontaktinformationen */}
                <div>
                  <h3 className="font-medium mb-3">Kontaktinformationen</h3>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Telefon</Label>
                    <Input
                      id="companyPhone"
                      className="col-span-3"
                      value={editForm.companyPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, companyPhone: e.target.value })}
                      placeholder="Firmentelefon"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">E-Mail</Label>
                    <Input
                      id="companyEmail"
                      className="col-span-3"
                      value={editForm.companyEmail || ''}
                      onChange={(e) => setEditForm({ ...editForm, companyEmail: e.target.value })}
                      placeholder="Firmen-E-Mail"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateUser}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benutzerdetails Dialog (Simple) */}
      <SimpleUserDetailsDialog 
        open={isDetailsDialogOpen} 
        onClose={() => setIsDetailsDialogOpen(false)} 
        userId={selectedUserId}
        onEdit={(user) => {
          setIsDetailsDialogOpen(false);
          handleEditUser(user);
        }}
        onToggleActive={(userId) => toggleActivationMutation.mutate(userId)}
        onDelete={(userId) => {
          setIsDetailsDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/superadmin/users'] });
        }}
      />

      {/* Vollständige Benutzerdetails Dialog */}
      <UserDetailsDialog 
        open={isUserDetailsDialogOpen} 
        onClose={() => setIsUserDetailsDialogOpen(false)} 
        userId={selectedUserId}
        onEdit={(userId) => {
          setIsUserDetailsDialogOpen(false);
          const userToEdit = users?.find(u => u.id === userId);
          if (userToEdit) {
            handleEditUser(userToEdit);
          }
        }}
        onToggleActive={(userId) => {
          toggleActivationMutation.mutate(userId);
        }}
      />
    </div>
  );
}
