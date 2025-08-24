import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { 
  BarChart3, 
  Building2, 
  Users, 
  Package, 
  Activity, 
  TrendingUp,
  Euro,
  CheckCircle,
  Clock,
  Eye,
  Edit3,
  LogOut,
  UserPlus,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  UserCircle,
  History,
  Smartphone,
  Phone,
  Mail,
  MapPin,
  Tag,
  Pen,
  FileText,
  AlertCircle,
  Circle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ShopManagementDialog } from "@/components/multi-shop/ShopManagementDialog";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { MultiShopAdminSidebar } from "@/components/multi-shop/MultiShopAdminSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnlineStatusWidget } from "@/components/multi-shop/OnlineStatusWidget";
import { useOnlineStatus } from "@/hooks/use-online-status";

// Shop Details Dialog mit Reparaturen-Einsicht
function ShopDetailsDialog({ shop }: { shop: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "active" | "history">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  
  // Shop-spezifische Reparaturen laden
  const { data: activeRepairs = [], isLoading: isLoadingActive } = useQuery({
    queryKey: ["/api/multi-shop/shop-repairs", shop.shopId, "active"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/multi-shop/shop-repairs/${shop.shopId}/active`);
      return response.json();
    },
    enabled: isOpen && activeTab === "active"
  });

  const { data: repairHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/multi-shop/shop-repairs", shop.shopId, "history"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/multi-shop/shop-repairs/${shop.shopId}/history`);
      return response.json();
    },
    enabled: isOpen && activeTab === "history"
  });

  // Filter aktive Reparaturen
  const filteredActiveRepairs = activeRepairs.filter((repair: any) => {
    const matchesStatus = statusFilter === "all" || repair.status === statusFilter;
    const matchesSearch = !searchTerm || 
      repair.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.deviceInfo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.issue?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusLabels = {
    'eingegangen': 'Eingegangen',
    'ersatzteile_bestellen': 'Ersatzteile bestellen', 
    'ersatzteil_eingetroffen': 'Ersatzteil eingetroffen',
    'ausser_haus': 'Außer Haus',
    'abholbereit': 'Abholbereit',
    'abgeschlossen': 'Abgeschlossen'
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'eingegangen': return 'secondary';
      case 'ersatzteile_bestellen': return 'destructive';
      case 'ersatzteil_eingetroffen': return 'default';
      case 'ausser_haus': return 'outline';
      case 'abholbereit': return 'default';
      case 'abgeschlossen': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Shop-Details: {shop.businessName}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Shop-ID: {shop.shopId} • Reparatur-Management und -Übersicht
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "active" | "history")} className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto mb-4">
                <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Übersicht</TabsTrigger>
                <TabsTrigger value="active" className="text-xs sm:text-sm py-2">Aktive ({activeRepairs.length})</TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm py-2">Verlauf</TabsTrigger>
              </TabsList>

              <div className="w-full space-y-4">
                {/* Übersicht Tab */}
                <TabsContent value="overview" className="space-y-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Shop-Metriken
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Aktive Reparaturen</span>
                          <span className="font-bold">{shop.metrics?.activeRepairs || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Abgeschlossene Reparaturen</span>
                          <span className="font-bold">{shop.metrics?.completedRepairs || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Mitarbeiter</span>
                          <span className="font-bold">{shop.metrics?.totalEmployees || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Gesamtumsatz</span>
                          <span className="font-bold">€{shop.metrics?.totalRevenue?.toLocaleString('de-DE') || '0'}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Ø Bearbeitungszeit</span>
                          <span className="font-bold">4,2 Tage</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Kundenbeschwerdequote</span>
                          <span className="font-bold text-green-600">2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Pünktlichkeit</span>
                          <span className="font-bold text-green-600">94%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Aktive Reparaturen Tab */}
                <TabsContent value="active" className="space-y-4 m-0">
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Suchen nach Auftrag, Kunde, Gerät..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status filtern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Status</SelectItem>
                        <SelectItem value="eingegangen">Eingegangen</SelectItem>
                        <SelectItem value="ersatzteile_bestellen">Ersatzteile bestellen</SelectItem>
                        <SelectItem value="ersatzteil_eingetroffen">Ersatzteil eingetroffen</SelectItem>
                        <SelectItem value="ausser_haus">Außer Haus</SelectItem>
                        <SelectItem value="abholbereit">Abholbereit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isLoadingActive ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : filteredActiveRepairs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm || statusFilter !== "all" 
                        ? "Keine Reparaturen entsprechen den Filterkriterien"
                        : "Keine aktiven Reparaturen vorhanden"
                      }
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredActiveRepairs.map((repair: any) => (
                        <Card key={repair.id} className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => setSelectedRepair(repair)}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{repair.orderCode}</span>
                                  <Badge variant={getStatusVariant(repair.status)}>
                                    {statusLabels[repair.status as keyof typeof statusLabels] || repair.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {repair.deviceInfo} • {repair.customerName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {repair.issue}
                                </p>
                              </div>
                              <div className="text-right">
                                {repair.cost && (
                                  <div className="text-lg font-semibold text-green-600 mb-1">
                                    €{repair.cost}
                                  </div>
                                )}
                                {repair.assignedEmployee && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <UserCircle className="h-3 w-3" />
                                    {repair.assignedEmployee}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(repair.createdAt).toLocaleDateString('de-DE')}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Reparatur-Verlauf Tab */}
                <TabsContent value="history" className="space-y-4 m-0">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Statistik (Letzte 30 Tage)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {repairHistory.filter((r: any) => r.status === 'abgeschlossen').length}
                              </div>
                              <div className="text-sm text-gray-600">Abgeschlossen</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {repairHistory.filter((r: any) => r.status === 'abholbereit').length}
                              </div>
                              <div className="text-sm text-gray-600">Abholbereit</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {repairHistory.length}
                              </div>
                              <div className="text-sm text-gray-600">Gesamt</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {new Set(repairHistory.map((r: any) => r.customerName)).size}
                              </div>
                              <div className="text-sm text-gray-600">Kunden</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Liste der Historie-Reparaturen */}
                      {repairHistory.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">Alle Reparaturen ({repairHistory.length})</h3>
                          </div>
                          {repairHistory.map((repair: any) => (
                            <Card key={repair.id} className="cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => setSelectedRepair(repair)}>
                              <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start gap-3 sm:gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                                      <Badge variant={getStatusVariant(repair.status)}>
                                        {statusLabels[repair.status as keyof typeof statusLabels] || repair.status}
                                      </Badge>
                                      <span className="font-mono text-sm truncate">{repair.orderCode}</span>
                                    </div>
                                    <div className="text-sm space-y-1">
                                      <div className="font-medium truncate">{repair.deviceInfo}</div>
                                      <div className="text-gray-600 line-clamp-2">{repair.issue}</div>
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                                        <span className="truncate">{repair.customerName}</span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="hidden sm:inline">•</span>
                                          <span>Erstellt: {new Date(repair.createdAt).toLocaleDateString('de-DE')}</span>
                                          <span>•</span>
                                          <span>Aktualisiert: {new Date(repair.updatedAt).toLocaleDateString('de-DE')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end text-right flex-shrink-0 min-w-[80px]">
                                    {repair.cost && (
                                      <div className="text-base sm:text-lg font-semibold">€{repair.cost}</div>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">{new Date(repair.updatedAt).toLocaleDateString('de-DE')}</span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Reparatur-Historie</h3>
                            <p className="text-gray-500">Keine Reparaturen in den letzten 30 Tagen gefunden.</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
              </div>
              
              {/* Mobile Close Button - am Ende des scrollbaren Contents */}
              <div className="sm:hidden mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                  size="lg"
                >
                  Dialog schließen
                </Button>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Readonly Repair Details Dialog */}
      {selectedRepair && (
        <ReadonlyRepairDetailsDialog 
          repair={selectedRepair} 
          isOpen={!!selectedRepair}
          onClose={() => setSelectedRepair(null)}
        />
      )}
    </>
  );
}

// Readonly Reparatur-Details Dialog - alles in einem Dialog wie im normalen RepairDetailsDialog
function ReadonlyRepairDetailsDialog({ 
  repair, 
  isOpen, 
  onClose 
}: { 
  repair: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!repair) return null;



  const statusLabels = {
    'eingegangen': 'Eingegangen',
    'ersatzteile_bestellen': 'Ersatzteile bestellen', 
    'ersatzteil_eingetroffen': 'Ersatzteil eingetroffen',
    'ausser_haus': 'Außer Haus',
    'abholbereit': 'Abholbereit',
    'abgeschlossen': 'Abgeschlossen'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Reparaturauftrag {repair.orderCode}
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zum Reparaturauftrag und Kundendaten
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kundendaten - exakt wie im normalen RepairDetailsDialog */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <User className="h-5 w-5" />
              Kundendaten
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium">{repair.customerName || 'Unbekannter Kunde'}</div>
                </div>
              </div>
              
              {repair.customerPhone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <a 
                      href={`tel:${repair.customerPhone}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {repair.customerPhone}
                    </a>
                  </div>
                </div>
              )}
              
              {repair.customerEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <a 
                      href={`mailto:${repair.customerEmail}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {repair.customerEmail}
                    </a>
                  </div>
                </div>
              )}
              
              {repair.customerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div>{repair.customerAddress}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>Kunde seit {new Date(repair.createdAt).toLocaleDateString('de-DE')}</div>
              </div>
              
              {repair.createdBy && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Kunde erstellt von</div>
                    <div className="text-sm font-medium">{repair.createdBy}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Gerätedaten - exakt wie im normalen RepairDetailsDialog */}
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border">
            <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5" />
              Gerätedaten
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium">{repair.deviceInfo}</div>
                  <div className="text-sm text-muted-foreground">Smartphone</div>
                </div>
              </div>
              
              {repair.serialNumber && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Seriennummer</div>
                    <div>{repair.serialNumber}</div>
                  </div>
                </div>
              )}
              
              {repair.deviceCode && (
                <div className="flex items-start gap-2">
                  <Pen className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Gerätecode</div>
                    <div>{repair.deviceCode}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Fehlerbeschreibung</div>
                  <div className="whitespace-pre-wrap">
                    {repair.issue}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="flex items-center gap-1">
                      <div className="text-xs text-muted-foreground">Verlauf</div>
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={repair.status === 'abgeschlossen' ? 'default' : 'secondary'}
                      className="text-orange-600 bg-orange-50"
                    >
                      {statusLabels[repair.status as keyof typeof statusLabels] || repair.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      von {repair.assignedEmployee || 'System'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(repair.updatedAt).toLocaleString('de-DE')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Auftragsinformationen - exakt wie im normalen RepairDetailsDialog */}
        <div className="bg-slate-50 rounded-lg p-4 shadow-sm border md:col-span-2">
          <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5" />
            Auftragsinformationen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Auftragsdatum</div>
                  <div>{new Date(repair.createdAt).toLocaleDateString('de-DE')}</div>
                </div>
              </div>
              
              {repair.cost && (
                <div className="flex items-start gap-2">
                  <Euro className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Kostenvoranschlag</div>
                    <div className="font-medium">€{repair.cost}</div>
                  </div>
                </div>
              )}
            </div>
            
            {repair.notes && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-sm text-muted-foreground">Notizen</div>
                  <div className="whitespace-pre-wrap">{repair.notes}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dashboard Statistiken mit Zeitraum-Filter
function DashboardStats() {
  // Zeitraum aus localStorage laden oder Standard verwenden
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'>(() => {
    const saved = localStorage.getItem('msa-selected-period');
    return (saved as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom') || 'month';
  });
  // Benutzerdefinierte Daten aus localStorage laden
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(() => {
    const saved = localStorage.getItem('msa-custom-start-date');
    return saved ? new Date(saved) : undefined;
  });
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(() => {
    const saved = localStorage.getItem('msa-custom-end-date');
    return saved ? new Date(saved) : undefined;
  });

  // Zeitraum-Änderung Handler mit localStorage-Speicherung
  const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom') => {
    setSelectedPeriod(period);
    localStorage.setItem('msa-selected-period', period);
  };

  // Custom Date Handler mit localStorage-Speicherung
  const handleCustomStartDateChange = (date: Date | undefined) => {
    setCustomStartDate(date);
    localStorage.setItem('msa-custom-start-date', date ? date.toISOString() : '');
  };

  const handleCustomEndDateChange = (date: Date | undefined) => {
    setCustomEndDate(date);
    localStorage.setItem('msa-custom-end-date', date ? date.toISOString() : '');
  };

  // Dashboard-Übersicht mit Zeitraum-Filter
  const { data: shops, isLoading } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops", selectedPeriod, customStartDate, customEndDate],
    queryFn: async () => {
      let url = `/api/multi-shop/accessible-shops?period=${selectedPeriod}`;
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        const startStr = format(customStartDate, 'yyyy-MM-dd');
        const endStr = format(customEndDate, 'yyyy-MM-dd');
        url = `/api/multi-shop/accessible-shops?start=${startStr}&end=${endStr}`;
      }
      const response = await apiRequest("GET", url);
      return response.json();
    },
    refetchInterval: 30000 // Alle 30 Sekunden aktualisieren für Echtzeit-Daten
  });

  const periodLabels = {
    'day': 'Heute',
    'week': 'Diese Woche', 
    'month': 'Dieser Monat',
    'quarter': 'Dieses Quartal',
    'year': 'Dieses Jahr',
    'all': 'Gesamtzeitraum',
    'custom': 'Benutzerdefiniert'
  };

  const getDisplayLabel = () => {
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      const start = format(customStartDate, 'dd.MM.yyyy', { locale: de });
      const end = format(customEndDate, 'dd.MM.yyyy', { locale: de });
      return `${start} - ${end}`;
    }
    return periodLabels[selectedPeriod];
  };

  // Berechne Gesamtstatistiken über alle Shops
  const totalStats = shops?.reduce((acc: any, shop: any) => {
    const metrics = shop.metrics || {};
    return {
      totalRepairs: acc.totalRepairs + (metrics.totalRepairs || 0),
      activeRepairs: acc.activeRepairs + (metrics.activeRepairs || 0),
      completedRepairs: acc.completedRepairs + (metrics.completedRepairs || 0),
      totalRevenue: acc.totalRevenue + (metrics.totalRevenue || 0),
      periodRevenue: acc.periodRevenue + (metrics.periodRevenue || 0),
      totalEmployees: acc.totalEmployees + (metrics.totalEmployees || 0),
      pendingOrders: acc.pendingOrders + (metrics.pendingOrders || 0)
    };
  }, {
    totalRepairs: 0,
    activeRepairs: 0, 
    completedRepairs: 0,
    totalRevenue: 0,
    periodRevenue: 0,
    totalEmployees: 0,
    pendingOrders: 0
  }) || {
    totalRepairs: 0,
    activeRepairs: 0,
    completedRepairs: 0, 
    totalRevenue: 0,
    periodRevenue: 0,
    totalEmployees: 0,
    pendingOrders: 0
  };

  return (
    <div className="space-y-6">
      {/* Zeitraum-Filter Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dashboard Übersicht</CardTitle>
              <CardDescription>Multi-Shop Statistiken für {getDisplayLabel()}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={(value: any) => handlePeriodChange(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Heute</SelectItem>
                  <SelectItem value="week">Diese Woche</SelectItem>
                  <SelectItem value="month">Dieser Monat</SelectItem>
                  <SelectItem value="quarter">Dieses Quartal</SelectItem>
                  <SelectItem value="year">Dieses Jahr</SelectItem>
                  <SelectItem value="all">Gesamtzeitraum</SelectItem>
                  <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Von</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "dd.MM.yyyy", { locale: de }) : "Startdatum wählen"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={customStartDate}
                          onSelect={handleCustomStartDateChange}
                          locale={de}
                          disabled={(date) => date > new Date() || (customEndDate ? date > customEndDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Bis</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "dd.MM.yyyy", { locale: de }) : "Enddatum wählen"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={customEndDate}
                          onSelect={handleCustomEndDateChange}
                          locale={de}
                          disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards mit echten Daten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Offene Reparaturen
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalStats.activeRepairs}</div>
            <p className="text-xs text-gray-500 mt-1">Alle Standorte</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {selectedPeriod === 'all' ? 'Abgeschlossene Reparaturen' : `Abgeschlossene (${periodLabels[selectedPeriod]})`}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {selectedPeriod === 'all' ? totalStats.completedRepairs : (totalStats.periodRevenue ? Math.round(totalStats.periodRevenue / 89.99) : 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{getDisplayLabel()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Aktive Shops
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{shops?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Verfügbare Shops</p>
          </CardContent>
        </Card>
      </div>

      {/* Umsatz-Charts mit echten Daten */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Umsätze nach Shop */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Umsätze nach Shop ({getDisplayLabel()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shops?.map((shop: any) => {
                const metrics = shop.metrics || {};
                const revenue = selectedPeriod === 'all' ? metrics.totalRevenue : metrics.periodRevenue;
                const maxRevenue = Math.max(...(shops?.map((s: any) => selectedPeriod === 'all' ? s.metrics?.totalRevenue || 0 : s.metrics?.periodRevenue || 0) || [1]));
                const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={shop.shopId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{shop.businessName}</span>
                      <span className="text-sm font-bold">€{revenue?.toLocaleString('de-DE') || '0'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              
              {/* Gesamtumsatz */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Gesamtumsatz</span>
                  <span className="text-lg font-bold text-green-600">
                    €{(selectedPeriod === 'all' ? totalStats.totalRevenue : totalStats.periodRevenue)?.toLocaleString('de-DE') || '0'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shop-Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Shop-Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shops?.map((shop: any) => {
                const metrics = shop.metrics || {};
                return (
                  <div key={shop.shopId} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-medium">{shop.businessName}</span>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Aktiv: {metrics.activeRepairs || 0}
                          </span>
                          <span className="text-xs text-gray-500">
                            Mitarbeiter: {metrics.totalEmployees || 0}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {selectedPeriod === 'all' ? metrics.completedRepairs : Math.round((metrics.periodRevenue || 0) / 89.99)}
                        </div>
                        <div className="text-xs text-gray-500">Reparaturen</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detaillierte Übersichten */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gesamtübersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gesamte Reparaturen</span>
                <span className="font-medium">{totalStats.totalRepairs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Offene Reparaturen</span>
                <span className="font-medium">{totalStats.activeRepairs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gesamte Mitarbeiter</span>
                <span className="font-medium">{totalStats.totalEmployees}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Umsatz-Kennzahlen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gesamtumsatz</span>
                <span className="font-medium">€{totalStats.totalRevenue?.toLocaleString('de-DE') || '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{periodLabels[selectedPeriod]}</span>
                <span className="font-medium">€{totalStats.periodRevenue?.toLocaleString('de-DE') || '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ø pro Reparatur</span>
                <span className="font-medium">€89,99</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop-Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shops?.map((shop: any) => (
                <div key={shop.shopId} className="flex items-center justify-between">
                  <span className="text-sm">{shop.businessName}</span>
                  <Badge variant={shop.isActive ? "default" : "secondary"}>
                    {shop.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Shop Übersicht
function ShopsOverview() {
  // Zeitraum aus localStorage laden oder Standard verwenden (synchron mit Dashboard)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'>(() => {
    const saved = localStorage.getItem('msa-selected-period');
    return (saved as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom') || 'month';
  });
  // Benutzerdefinierte Daten aus localStorage laden (synchron mit Dashboard)
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(() => {
    const saved = localStorage.getItem('msa-custom-start-date');
    return saved ? new Date(saved) : undefined;
  });
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(() => {
    const saved = localStorage.getItem('msa-custom-end-date');
    return saved ? new Date(saved) : undefined;
  });

  // Zeitraum-Änderung Handler mit localStorage-Speicherung (synchron mit Dashboard)
  const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom') => {
    setSelectedPeriod(period);
    localStorage.setItem('msa-selected-period', period);
  };

  // Custom Date Handler mit localStorage-Speicherung (synchron mit Dashboard)
  const handleCustomStartDateChange = (date: Date | undefined) => {
    setCustomStartDate(date);
    localStorage.setItem('msa-custom-start-date', date ? date.toISOString() : '');
  };

  const handleCustomEndDateChange = (date: Date | undefined) => {
    setCustomEndDate(date);
    localStorage.setItem('msa-custom-end-date', date ? date.toISOString() : '');
  };
  
  const { data: shops, isLoading } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops", selectedPeriod, customStartDate, customEndDate],
    queryFn: async () => {
      let url = `/api/multi-shop/accessible-shops?period=${selectedPeriod}`;
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        url = `/api/multi-shop/accessible-shops?start=${customStartDate}&end=${customEndDate}`;
      }
      const response = await apiRequest("GET", url);
      return response.json();
    }
  });

  const periodLabels = {
    'day': 'Heute',
    'week': 'Diese Woche', 
    'month': 'Dieser Monat',
    'quarter': 'Dieses Quartal',
    'year': 'Dieses Jahr',
    'all': 'Gesamtzeitraum',
    'custom': 'Benutzerdefiniert'
  };

  const getDisplayLabel = () => {
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      const start = format(customStartDate, 'dd.MM.yyyy', { locale: de });
      const end = format(customEndDate, 'dd.MM.yyyy', { locale: de });
      return `${start} - ${end}`;
    }
    return periodLabels[selectedPeriod];
  };

  if (!shops || shops.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Keine Shops verfügbar</p>
            <p className="text-sm">Shops werden aus echten Daten geladen</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Lade Shop-Statistiken...</p>
            <p className="text-sm">Daten werden berechnet für: {periodLabels[selectedPeriod]}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zeitraum-Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shop-Übersicht</CardTitle>
              <CardDescription>Statistiken für {getDisplayLabel()}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={(value: any) => handlePeriodChange(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Heute</SelectItem>
                  <SelectItem value="week">Diese Woche</SelectItem>
                  <SelectItem value="month">Dieser Monat</SelectItem>
                  <SelectItem value="quarter">Dieses Quartal</SelectItem>
                  <SelectItem value="year">Dieses Jahr</SelectItem>
                  <SelectItem value="all">Gesamtzeitraum</SelectItem>
                  <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Von</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !customStartDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "dd.MM.yyyy", { locale: de }) : "Startdatum wählen"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={customStartDate}
                          onSelect={handleCustomStartDateChange}
                          locale={de}
                          disabled={(date) => date > new Date() || (customEndDate ? date > customEndDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Bis</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !customEndDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "dd.MM.yyyy", { locale: de }) : "Enddatum wählen"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={customEndDate}
                          onSelect={handleCustomEndDateChange}
                          locale={de}
                          disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Shop Cards - Dynamisch geladen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops.map((shop: any) => (
          <Card key={shop.shopId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{shop.businessName}</CardTitle>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  AKTIV
                </Badge>
              </div>
              <CardDescription>Shop-ID: {shop.shopId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{selectedPeriod === 'all' ? 'Gesamtumsatz' : `Umsatz (${periodLabels[selectedPeriod]})`}</p>
                  <p className="text-xl font-bold">€{(selectedPeriod === 'all' ? shop.metrics?.totalRevenue : shop.metrics?.periodRevenue)?.toLocaleString() || '0'}</p>
                  {selectedPeriod !== 'all' && (
                    <p className="text-xs text-gray-500">
                      Gesamt: €{shop.metrics?.totalRevenue?.toLocaleString() || '0'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mitarbeiter</p>
                  <p className="text-xl font-bold">{shop.metrics?.totalEmployees || '0'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Offen:</span>
                  <span className="ml-2 font-semibold text-orange-600">{shop.metrics?.activeRepairs || '0'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Erledigt ({selectedPeriod === 'all' ? 'Gesamt' : periodLabels[selectedPeriod]}):</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {selectedPeriod === 'all' ? shop.metrics?.completedRepairs : shop.metrics?.periodCompletedRepairs || '0'}
                  </span>
                  {selectedPeriod !== 'all' && (
                    <div className="text-xs text-gray-500 mt-1">
                      Gesamt: {shop.metrics?.completedRepairs || '0'}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span>Zugriff gewährt: </span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <ShopDetailsDialog shop={shop} />
                <ShopManagementDialog shop={shop} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Neuer Mitarbeiter Dialog
function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shopId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const { toast } = useToast();

  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/multi-shop/create-employee", {
        shopId: parseInt(data.shopId),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: 'employee'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Mitarbeiter wurde erfolgreich erstellt",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
      setOpen(false);
      setFormData({
        shopId: '',
        firstName: '',
        lastName: '',
        email: '',
        password: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Mitarbeiters",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopId || !formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus",
        variant: "destructive",
      });
      return;
    }
    createEmployeeMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4">
          <UserPlus className="h-4 w-4 mr-2" />
          Neuer Mitarbeiter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Mitarbeiter erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Mitarbeiter für einen Ihrer Shops
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop">Shop auswählen</Label>
            <Select value={formData.shopId} onValueChange={(value) => setFormData({...formData, shopId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Shop auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {shops?.map((shop: any) => (
                  <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                    {shop.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Vorname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="Nachname"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="mitarbeiter@shop.de"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Sicheres Passwort"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Abbrechen
            </Button>
            <Button type="submit" disabled={createEmployeeMutation.isPending} className="flex-1">
              {createEmployeeMutation.isPending ? "Erstelle..." : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Employee Dialog
function EditEmployeeDialog({ employee, open, onOpenChange }: { employee: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    password: '',
    isActive: employee?.isActive ?? true
  });

  // Update form data when employee changes
  React.useEffect(() => {
    setFormData({
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      password: '',
      isActive: employee?.isActive ?? true
    });
  }, [employee]);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const { toast } = useToast();

  const editEmployeeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PUT", `/api/multi-shop/employees/${employee.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Mitarbeiter wurde erfolgreich aktualisiert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Mitarbeiters",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus",
        variant: "destructive",
      });
      return;
    }
    editEmployeeMutation.mutate(formData);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Daten von {employee.firstName} {employee.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="changePassword"
                checked={showPasswordField}
                onChange={(e) => setShowPasswordField(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="changePassword">Passwort ändern</Label>
            </div>
            {showPasswordField && (
              <Input
                id="password"
                type="password"
                placeholder="Neues Passwort"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="isActive">Aktiv</Label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={editEmployeeMutation.isPending}>
              {editEmployeeMutation.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Shop-Wechsel Dialog
function ShopReassignmentDialog({ employee, open, onOpenChange }: { 
  employee: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [selectedShop, setSelectedShop] = useState("");
  const { toast } = useToast();

  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  const reassignMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const response = await apiRequest("PATCH", `/api/multi-shop/employees/${employee.id}/shop`, {
        shopId: parseInt(shopId)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Shop-Wechsel erfolgreich",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
      onOpenChange(false);
      setSelectedShop("");
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Shop-Wechsel",
        description: error.message || "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedShop) {
      toast({
        title: "Shop auswählen",
        description: "Bitte wählen Sie einen Ziel-Shop aus",
        variant: "destructive",
      });
      return;
    }
    reassignMutation.mutate(selectedShop);
  };

  // Verfügbare Shops (ohne den aktuellen Shop)
  const availableShops = shops?.filter((shop: any) => shop.shopId !== employee.shopId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mitarbeiter zu anderem Shop verschieben</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Mitarbeiter</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border">
              {employee.username || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Aktueller Shop</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border">
              {employee.businessName}
            </div>
          </div>
          
          <div>
            <Label htmlFor="targetShop" className="text-sm font-medium">Ziel-Shop</Label>
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Shop auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {availableShops.map((shop: any) => (
                  <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                    {shop.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={reassignMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={reassignMutation.isPending || !selectedShop}
            >
              {reassignMutation.isPending ? "Verschiebe..." : "Verschieben"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Employee Actions Dropdown
function EmployeeActionsDropdown({ employee }: { employee: any }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shopReassignDialogOpen, setShopReassignDialogOpen] = useState(false);
  const { toast } = useToast();

  const toggleStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await apiRequest("PATCH", `/api/multi-shop/employees/${employee.id}/status`, { isActive });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Ändern des Status",
        variant: "destructive",
      });
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/multi-shop/employees/${employee.id}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Mitarbeiters",
        variant: "destructive",
      });
    }
  });

  // Nicht für Shop-Owner
  if (employee.role === 'owner') {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => toggleStatusMutation.mutate(!employee.isActive)}
            disabled={toggleStatusMutation.isPending}
          >
            {employee.isActive ? (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Deaktivieren
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Aktivieren
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShopReassignDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Shop wechseln
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mitarbeiter löschen</AlertDialogTitle>
                <AlertDialogDescription>
                  Sind Sie sicher, dass Sie {employee.firstName} {employee.lastName} löschen möchten? 
                  Diese Aktion kann nicht rückgängig gemacht werden und alle zugehörigen Daten werden entfernt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteEmployeeMutation.mutate()}
                  disabled={deleteEmployeeMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteEmployeeMutation.isPending ? "Lösche..." : "Löschen"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <EditEmployeeDialog 
        employee={employee} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
      />
      
      <ShopReassignmentDialog
        employee={employee}
        open={shopReassignDialogOpen}
        onOpenChange={setShopReassignDialogOpen}
      />
    </>
  );
}

// Mitarbeiter Übersicht
function EmployeesOverview() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const { onlineUsers, isUserOnline } = useOnlineStatus();
  
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["/api/multi-shop/employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/employees");
      return response.json();
    }
  });

  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  // Filter- und Suchlogik (MUSS vor den bedingten Returns stehen!)
  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    
    let filtered = [...employees];
    
    // Nach Shop filtern
    if (selectedShop !== "all") {
      filtered = filtered.filter(emp => emp.shopId === parseInt(selectedShop));
    }
    
    // Nach Suchterm filtern
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => {
        const name = emp.username || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        return name.toLowerCase().includes(term) || 
               emp.email.toLowerCase().includes(term);
      });
    }
    
    return filtered;
  }, [employees, selectedShop, searchTerm]);

  // Nach Shops gruppieren (MUSS vor den bedingten Returns stehen!)
  const employeesByShop = React.useMemo(() => {
    const grouped = new Map();
    
    filteredEmployees.forEach(employee => {
      const shopName = employee.businessName;
      if (!grouped.has(shopName)) {
        grouped.set(shopName, []);
      }
      grouped.get(shopName).push(employee);
    });
    
    // Sortiere Shops alphabetisch
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEmployees]);

  console.log("EmployeesOverview Debug:", { employees, isLoading, error });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-xl font-medium">Lade Mitarbeiter-Daten...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-red-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-red-300" />
            <p className="text-xl font-medium">Fehler beim Laden der Mitarbeiter</p>
            <p className="text-sm">{error.message || "Unbekannter Fehler"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="space-y-6">
        <CreateEmployeeDialog />
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Keine Mitarbeiter vorhanden</p>
            <p className="text-sm">Erstellen Sie den ersten Mitarbeiter</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CreateEmployeeDialog />
      
      {/* Grid Layout mit Online-Status Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Filter und Suche */}
          <Card>
        <CardHeader>
          <CardTitle>Mitarbeiterübersicht ({filteredEmployees?.length || 0} von {employees?.length || 0} Mitarbeitern)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            {/* Suchfeld */}
            <div className="flex-1">
              <Input
                placeholder="Nach Name oder E-Mail suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm md:text-base"
              />
            </div>
            
            {/* Shop-Filter */}
            <div className="w-full sm:w-48 md:w-64">
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger className="text-sm md:text-base">
                  <SelectValue placeholder="Shop auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Shops</SelectItem>
                  {shops?.map((shop: any) => (
                    <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                      {shop.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mitarbeiter nach Shops gruppiert */}
      {employeesByShop.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium">Keine Mitarbeiter gefunden</p>
              <p className="text-sm">Passen Sie Ihre Suchkriterien an</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        employeesByShop.map(([shopName, shopEmployees]) => (
          <Card key={shopName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {shopName} ({shopEmployees.length} Mitarbeiter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">Mitarbeiter</th>
                      <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">Rolle</th>
                      <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">Status</th>
                      <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">Online</th>
                      <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopEmployees.map((employee: any) => (
                      <tr key={employee.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 md:px-4">
                          <div>
                            <p className="font-medium text-sm md:text-base">
                              {employee.username 
                                ? employee.username 
                                : (employee.firstName || employee.lastName) 
                                  ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() 
                                  : employee.email || 'Unbekannt'}
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 truncate max-w-[120px] md:max-w-none">{employee.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <Badge variant="outline" className={`text-xs ${
                            employee.role === 'owner' ? "bg-purple-50 text-purple-700" :
                            employee.role === 'employee' ? "bg-green-50 text-green-700" :
                            "bg-orange-50 text-orange-700"
                          }`}>
                            {employee.role === 'owner' ? 'Inhaber' :
                             employee.role === 'employee' ? 'Mitarbeiter' :
                             employee.role === 'kiosk' ? 'Kiosk' : employee.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <Badge variant="outline" className={`text-xs ${
                            employee.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}>
                            {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            {(() => {
                              const isOnlineLive = isUserOnline(employee.id);
                              return (
                                <>
                                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isOnlineLive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <Badge className={`text-xs ${isOnlineLive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                    {isOnlineLive ? 'Online' : 'Offline'}
                                  </Badge>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <EmployeeActionsDropdown employee={employee} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
        </div>
        
        {/* Online-Status Widget in der rechten Spalte */}
        <div className="lg:col-span-1">
          <OnlineStatusWidget />
        </div>
      </div>
    </div>
  );
}

// Bestellungen Übersicht
function OrdersOverview() {
  const [activeOrdersTab, setActiveOrdersTab] = useState<"active" | "archived">("active");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/multi-shop/orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/orders");
      return response.json();
    },
    refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
  });

  const { data: archivedOrders = [], isLoading: isLoadingArchived } = useQuery({
    queryKey: ["/api/multi-shop/orders/archived"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/orders/archived");
      return response.json();
    },
    refetchInterval: 10000, // Alle 10 Sekunden aktualisieren
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Status-Change-Mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest("PATCH", `/api/multi-shop/orders/${id}/status`, { status });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status geändert",
        description: data.message,
      });
      // Cache invalidieren um aktuelle Daten zu laden
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/orders/archived"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Ändern des Status",
        description: error.message || "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  // Filter die aktiven Bestellungen
  const filteredOrders = orders.filter((order: any) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier && order.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.businessName && order.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filter die archivierten Bestellungen
  const filteredArchivedOrders = archivedOrders.filter((order: any) => {
    const matchesSearch = !searchTerm || 
      order.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier && order.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.businessName && order.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Status Badge Komponente
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      'bestellen': 'bg-red-100 text-red-800',
      'bestellt': 'bg-yellow-100 text-yellow-800',
      'eingetroffen': 'bg-blue-100 text-blue-800',
      'erledigt': 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-0">
        <Card>
          <CardHeader>
            <CardTitle>Bestellungen - Zentrale Ersatzteil-Verwaltung</CardTitle>
            <CardDescription>Lade Ersatzteilbestellungen...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Ersatzteilbestellungen werden geladen...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="truncate">Bestellungen - Zentrale Ersatzteil-Verwaltung</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Verwalten Sie Ersatzteilbestellungen für alle Standorte zentral
          </CardDescription>
          
          {/* Tab Navigation */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4 overflow-x-auto">
            <Button
              variant={activeOrdersTab === "active" ? "default" : "outline"}
              onClick={() => setActiveOrdersTab("active")}
              className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
              size="sm"
            >
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Aktive Bestellungen</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                {filteredOrders.length}
              </Badge>
            </Button>
            <Button
              variant={activeOrdersTab === "archived" ? "default" : "outline"}
              onClick={() => setActiveOrdersTab("archived")}
              className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
              size="sm"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Archivierte Bestellungen</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                {filteredArchivedOrders.length}
              </Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Filter und Suche */}
          <div className="px-3 sm:px-0">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Suchen nach Ersatzteil, Hersteller, Modell, Shop oder Order-Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {activeOrdersTab === "active" && (
                <div className="sm:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Alle Status</option>
                    <option value="bestellen">Zu bestellen</option>
                    <option value="bestellt">Bestellt</option>
                    <option value="eingetroffen">Eingetroffen</option>
                    <option value="erledigt">Erledigt</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Aktive Bestellungen Tab */}
          {activeOrdersTab === "active" && (
            <>
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {orders.length === 0 ? "Keine Ersatzteile gefunden" : "Keine passenden Ersatzteile"}
                  </h3>
                  <p className="text-gray-500">
                    {orders.length === 0 
                      ? "Es gibt derzeit keine Ersatzteilbestellungen in den Shops."
                      : "Keine Ersatzteile entsprechen den aktuellen Filterkriterien."
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Tabelle */}
                  <div className="hidden lg:block overflow-x-auto px-3 sm:px-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ersatzteil
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hersteller & Modell
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shop
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order-Code
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.partName}</p>
                              {order.supplier && (
                                <p className="text-sm text-blue-600">{order.supplier}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.deviceInfo}</p>
                              {order.notes && (
                                <p className="text-sm text-gray-500 mt-1">{order.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => {
                                changeStatusMutation.mutate({ id: order.id, status: newStatus });
                              }}
                              disabled={changeStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bestellen">Zu bestellen</SelectItem>
                                <SelectItem value="bestellt">Bestellt</SelectItem>
                                <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                                <SelectItem value="erledigt">Erledigt</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.businessName}</p>
                              <p className="text-sm text-gray-500">Shop ID: {order.shopId}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-900">{order.orderCode}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-2 px-1">
                  {filteredOrders.map((order: any) => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg px-2 py-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{order.partName}</h3>
                      {order.supplier && (
                        <p className="text-xs text-blue-600 mt-1 truncate">{order.supplier}</p>
                      )}
                    </div>
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                      {order.orderCode}
                    </span>
                  </div>

                  {/* Device Info */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Gerät</p>
                    <p className="text-sm text-gray-900 truncate">{order.deviceInfo}</p>
                    {order.notes && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{order.notes}</p>
                    )}
                  </div>

                  {/* Shop Info */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Shop</p>
                    <p className="text-sm text-gray-900 truncate">{order.businessName}</p>
                    <p className="text-xs text-gray-500">ID: {order.shopId}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Status</p>
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) => {
                        changeStatusMutation.mutate({ id: order.id, status: newStatus });
                      }}
                      disabled={changeStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bestellen">Zu bestellen</SelectItem>
                        <SelectItem value="bestellt">Bestellt</SelectItem>
                        <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                        <SelectItem value="erledigt">Erledigt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    </div>
                  ))}
                </div>
              </>
              )}
            </>
          )}

          {/* Archivierte Bestellungen Tab */}
          {activeOrdersTab === "archived" && (
            <>
              {filteredArchivedOrders.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine archivierten Bestellungen gefunden
                  </h3>
                  <p className="text-gray-500">
                    Bestellungen werden automatisch archiviert, wenn sie als "eingetroffen" oder "erledigt" markiert werden.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Tabelle für Archivierte */}
                  <div className="hidden lg:block overflow-x-auto px-3 sm:px-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ersatzteil
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hersteller & Modell
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shop
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order-Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Archiviert am
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredArchivedOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.partName}</p>
                              {order.supplier && (
                                <p className="text-sm text-blue-600">{order.supplier}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.deviceInfo}</p>
                              {order.notes && (
                                <p className="text-sm text-gray-500 mt-1">{order.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => {
                                changeStatusMutation.mutate({ id: order.id, status: newStatus });
                              }}
                              disabled={changeStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bestellen">Zu bestellen</SelectItem>
                                <SelectItem value="bestellt">Bestellt</SelectItem>
                                <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                                <SelectItem value="erledigt">Erledigt</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.businessName}</p>
                              <p className="text-sm text-gray-500">Shop ID: {order.shopId}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-900">{order.orderCode}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-500">
                              {new Date(order.updatedAt).toLocaleDateString('de-DE')}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards für Archivierte */}
                <div className="lg:hidden space-y-3 px-3 sm:px-0">
                  {filteredArchivedOrders.map((order: any) => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg px-2 py-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{order.partName}</h3>
                          {order.supplier && (
                            <p className="text-xs text-blue-600 mt-1 truncate">{order.supplier}</p>
                          )}
                        </div>
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                          {order.orderCode}
                        </span>
                      </div>

                      {/* Device Info */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Gerät</p>
                        <p className="text-sm text-gray-900 truncate">{order.deviceInfo}</p>
                        {order.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{order.notes}</p>
                        )}
                      </div>

                      {/* Shop Info */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Shop</p>
                        <p className="text-sm text-gray-900 truncate">{order.businessName}</p>
                        <p className="text-xs text-gray-500">ID: {order.shopId}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Status</p>
                        <Select
                          value={order.status}
                          onValueChange={(newStatus) => {
                            changeStatusMutation.mutate({ id: order.id, status: newStatus });
                          }}
                          disabled={changeStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bestellen">Zu bestellen</SelectItem>
                            <SelectItem value="bestellt">Bestellt</SelectItem>
                            <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                            <SelectItem value="erledigt">Erledigt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Archivierungsdatum */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Archiviert am</p>
                        <p className="text-sm text-gray-900">
                          {new Date(order.updatedAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// MSA Profil Einstellungen
function MSAProfileSettings() {
  const { toast } = useToast();
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const { data: msaProfile } = useQuery({
    queryKey: ["/api/multi-shop/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/profile");
      return response.json();
    }
  });

  React.useEffect(() => {
    if (msaProfile) {
      setProfileData({
        firstName: msaProfile.firstName || '',
        lastName: msaProfile.lastName || '',
        email: msaProfile.email || '',
        phone: msaProfile.phone || ''
      });
    }
  }, [msaProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await apiRequest("PUT", "/api/multi-shop/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil aktualisiert",
        description: "Ihre Profildaten wurden erfolgreich gespeichert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Speichern der Profildaten",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil & Stammdaten</CardTitle>
          <CardDescription>Ihre persönlichen Kontoinformationen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  placeholder="Vorname eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  placeholder="Nachname eingeben"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Kontakt-E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                placeholder="Kontakt-E-Mail eingeben"
                required
              />
              <p className="text-xs text-muted-foreground">
                Diese E-Mail wird für Kontaktinformationen verwendet. Sie kann dieselbe wie Ihre Login-E-Mail sein oder eine separate Kontakt-E-Mail.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                placeholder="Telefonnummer eingeben"
              />
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Speichere..." : "Profil speichern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sicherheitseinstellungen</CardTitle>
          <CardDescription>Verwalten Sie Ihre Passwort- und Sicherheitseinstellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Passwort</h4>
                <p className="text-sm text-muted-foreground">
                  Ändern Sie Ihr Passwort für mehr Sicherheit
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsChangePasswordDialogOpen(true)}
              >
                Passwort ändern
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
    </div>
  );
}

// MSA Geschäftsdaten Einstellungen  
function MSABusinessSettings() {
  const { toast } = useToast();
  const [businessData, setBusinessData] = useState({
    companyName: '',
    contactPerson: '',
    street: '',
    city: '',
    zipCode: '',
    country: 'Deutschland',
    vatNumber: '',
    taxNumber: '',
    email: '',
    phone: ''
  });

  const { data: msaProfile } = useQuery({
    queryKey: ["/api/multi-shop/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/profile");
      return response.json();
    }
  });

  React.useEffect(() => {
    if (msaProfile?.businessData) {
      setBusinessData({
        companyName: msaProfile.businessData.companyName || '',
        contactPerson: msaProfile.businessData.contactPerson || '',
        street: msaProfile.businessData.street || '',
        city: msaProfile.businessData.city || '',
        zipCode: msaProfile.businessData.zipCode || '',
        country: msaProfile.businessData.country || 'Deutschland',
        vatNumber: msaProfile.businessData.vatNumber || '',
        taxNumber: msaProfile.businessData.taxNumber || '',
        email: msaProfile.businessData.email || '',
        phone: msaProfile.businessData.phone || ''
      });
    }
  }, [msaProfile]);

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: typeof businessData) => {
      const response = await apiRequest("PUT", "/api/multi-shop/business-data", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Geschäftsdaten aktualisiert",
        description: "Ihre Geschäftsdaten für die Rechnungsstellung wurden gespeichert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Speichern der Geschäftsdaten",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessMutation.mutate(businessData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Geschäftsdaten & Rechnungsstellung</CardTitle>
          <CardDescription>
            Diese Daten werden für die Rechnungsstellung aller Ihrer ClientKing-Shops verwendet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname</Label>
              <Input
                id="companyName"
                value={businessData.companyName}
                onChange={(e) => setBusinessData({...businessData, companyName: e.target.value})}
                placeholder="Firmenname eingeben"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Ansprechpartner</Label>
              <Input
                id="contactPerson"
                value={businessData.contactPerson}
                onChange={(e) => setBusinessData({...businessData, contactPerson: e.target.value})}
                placeholder="Ansprechpartner eingeben"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="street">Straße & Hausnummer</Label>
              <Input
                id="street"
                value={businessData.street}
                onChange={(e) => setBusinessData({...businessData, street: e.target.value})}
                placeholder="Straße eingeben"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">PLZ</Label>
                <Input
                  id="zipCode"
                  value={businessData.zipCode}
                  onChange={(e) => setBusinessData({...businessData, zipCode: e.target.value})}
                  placeholder="PLZ eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={businessData.city}
                  onChange={(e) => setBusinessData({...businessData, city: e.target.value})}
                  placeholder="Stadt eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={businessData.country}
                  onChange={(e) => setBusinessData({...businessData, country: e.target.value})}
                  placeholder="Land eingeben"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vatNumber">USt-IdNr. (optional)</Label>
                <Input
                  id="vatNumber"
                  value={businessData.vatNumber}
                  onChange={(e) => setBusinessData({...businessData, vatNumber: e.target.value})}
                  placeholder="USt-IdNr. eingeben"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Steuernummer (optional)</Label>
                <Input
                  id="taxNumber"
                  value={businessData.taxNumber}
                  onChange={(e) => setBusinessData({...businessData, taxNumber: e.target.value})}
                  placeholder="Steuernummer eingeben"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Geschäfts-E-Mail</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  value={businessData.email}
                  onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
                  placeholder="E-Mail eingeben"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessPhone">Geschäfts-Telefon</Label>
                <Input
                  id="businessPhone"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                  placeholder="Telefonnummer eingeben"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={updateBusinessMutation.isPending}>
              {updateBusinessMutation.isPending ? "Speichere..." : "Geschäftsdaten speichern"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// MSA Preisgestaltung Einstellungen
function MSAPricingSettings() {
  const { toast } = useToast();
  const { data: msaProfile } = useQuery({
    queryKey: ["/api/multi-shop/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/profile");
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preisgestaltung & Pakete</CardTitle>
          <CardDescription>Übersicht Ihrer ClientKing-Abonnements und Rechnungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Multi-Shop Abonnement</h3>
              <p className="text-blue-800 text-sm mb-3">
                Sie erhalten eine zentrale Rechnung für alle Ihre ClientKing-Shops basierend auf Ihren Geschäftsdaten.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Aktive Shops:</span>
                  <span className="font-medium">
                    {msaProfile?.pricing?.totalShops || 2} Shops
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Preis pro Shop:</span>
                  <span className="font-medium">
                    {msaProfile?.pricing 
                      ? `€${msaProfile.pricing.pricePerShop},00/Monat`
                      : "€29,90/Monat"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gesamt pro Monat:</span>
                  <span className="font-bold text-blue-900">
                    {msaProfile?.pricing 
                      ? `€${(msaProfile.pricing.pricePerShop * (msaProfile.pricing.totalShops || 2))},00`
                      : "€59,80"
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Rechnungsstellung</h3>
              <p className="text-gray-700 text-sm mb-3">
                Rechnungen werden monatlich im Voraus gestellt und per E-Mail zugesandt.
              </p>
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>Nächste Abrechnung:</span>
                  <span className="font-medium">01.02.2024</span>
                </div>
                <div className="flex justify-between">
                  <span>Zahlungsweise:</span>
                  <span className="font-medium">SEPA-Lastschrift</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// MSA Einstellungen - Navigation zu separaten Seiten (wird nicht mehr verwendet)
function MSASettings() {
  const [, navigate] = useLocation();

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Profil & Stammdaten',
      description: 'Persönliche Daten und Kontaktinformationen verwalten',
      icon: User,
      path: '/msa/profile'
    },
    {
      id: 'business',
      title: 'Geschäftsdaten & Rechnungsstellung',
      description: 'Firmeninformationen für die Abrechnung verwalten',
      icon: Building2,
      path: '/msa/business'
    },
    {
      id: 'pricing',
      title: 'Preisgestaltung & Pakete',
      description: 'Abrechnung und Preismodelle konfigurieren',
      icon: Euro,
      path: '/msa/pricing'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MSA Einstellungen</CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Multi-Shop Admin Einstellungen und Konfigurationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {settingsOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card 
                  key={option.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(option.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {option.description}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



// Logs Übersicht
function LogsOverview() {
  const [period, setPeriod] = useState("month");
  const [eventType, setEventType] = useState("all");
  const [showCalendar, setShowCalendar] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(
    localStorage.getItem('msa-logs-date-range') 
      ? JSON.parse(localStorage.getItem('msa-logs-date-range')!)
      : undefined
  );

  // Activity-Logs laden
  const { data: activityLogs = [], isLoading } = useQuery({
    queryKey: ['/api/multi-shop/activity-logs', period, eventType, customDateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        eventType,
        limit: '100',
        offset: '0'
      });

      if (period === 'custom' && customDateRange?.from && customDateRange?.to) {
        params.set('start', customDateRange.from.toISOString());
        params.set('end', customDateRange.to.toISOString());
      }

      const response = await fetch(`/api/multi-shop/activity-logs?${params}`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Activity-Logs');
      }
      return response.json();
    }
  });

  const handleCustomDateSubmit = () => {
    if (customDateRange) {
      localStorage.setItem('msa-logs-date-range', JSON.stringify(customDateRange));
      setPeriod('custom');
      setShowCalendar(false);
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'repair':
        return <Settings className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'order':
        return <Package className="h-4 w-4" />;
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `vor ${diffMinutes} Min`;
    } else if (diffHours < 24) {
      return `vor ${Math.floor(diffHours)} Std`;
    } else if (diffDays < 7) {
      return `vor ${Math.floor(diffDays)} Tagen`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="truncate">Aktivitäts-Logs</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Chronologische Übersicht aller Aktivitäten in allen verwalteten Shops
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {/* Filter Controls */}
          <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-4">
            {/* Zeitraum Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Zeitraum:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Heute</SelectItem>
                  <SelectItem value="week">Diese Woche</SelectItem>
                  <SelectItem value="month">Dieser Monat</SelectItem>
                  <SelectItem value="quarter">Dieses Quartal</SelectItem>
                  <SelectItem value="year">Dieses Jahr</SelectItem>
                  <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                  <SelectItem value="all">Alle</SelectItem>
                </SelectContent>
              </Select>
              
              {period === 'custom' && (
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      {customDateRange?.from
                        ? customDateRange.to
                          ? `${format(customDateRange.from, "dd.MM.yyyy")} - ${format(customDateRange.to, "dd.MM.yyyy")}`
                          : format(customDateRange.from, "dd.MM.yyyy")
                        : "Datum wählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <CalendarUI
                        mode="range"
                        selected={customDateRange}
                        onSelect={setCustomDateRange}
                        numberOfMonths={2}
                        className="rounded-md border"
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCalendar(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCustomDateSubmit}
                          disabled={!customDateRange?.from || !customDateRange?.to}
                        >
                          Anwenden
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Event-Typ Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Typ:</span>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="repair">Reparaturen</SelectItem>
                  <SelectItem value="user">Benutzer</SelectItem>
                  <SelectItem value="order">Bestellungen</SelectItem>
                  <SelectItem value="customer">Kunden</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activity Logs Liste */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Keine Aktivitäten gefunden
              </h3>
              <p className="text-sm sm:text-base text-gray-500">
                Für den gewählten Zeitraum und Filter wurden keine Aktivitäten gefunden.
              </p>
            </div>
          ) : (
            <div className="space-y-3 px-1">
              {activityLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full max-w-full overflow-hidden"
                >
                  {/* Event Icon */}
                  <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${getSeverityColor(log.severity)}`}>
                    {getEventTypeIcon(log.eventType)}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {log.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500">
                          {log.performedByUsername && (
                            <span>von {log.performedByUsername}</span>
                          )}
                          {log.shopName && (
                            <span className="truncate">• {log.shopName}</span>
                          )}
                          {log.entityName && (
                            <span className="truncate">• {log.entityName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <time className="text-xs text-gray-500">
                          {formatTimestamp(log.createdAt)}
                        </time>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                          {log.eventType}
                        </span>
                      </div>
                    </div>
                    
                    {/* Details expandieren bei Bedarf */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                          Details anzeigen
                        </summary>
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MultiShopAdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <MultiShopAdminSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={user || undefined}
        handleLogout={handleLogout}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header - Mobile und Desktop */}
        <header className="flex justify-between items-center py-3 px-4 md:py-4 md:px-6 bg-background shadow-sm border-b">
          {/* Mobile Titel */}
          <div className="flex items-center md:hidden">
            <h1 className="text-lg font-medium ml-10">
              {activeTab === "dashboard" && "Dashboard"}
              {activeTab === "shops" && "Shops"}
              {activeTab === "employees" && "Mitarbeiter"}
              {activeTab === "orders" && "Bestellungen"}
              {activeTab === "logs" && "Logs"}
              {activeTab === "settings" && "Geschäft"}
              {activeTab === "account" && "Konto"}
            </h1>
          </div>
          
          {/* Desktop Titel */}
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold">
              {activeTab === "dashboard" && "Multi-Shop Admin Dashboard"}
              {activeTab === "shops" && "Shop-Verwaltung"}
              {activeTab === "employees" && "Mitarbeiter-Verwaltung"}
              {activeTab === "orders" && "Bestellungen-Übersicht"}
              {activeTab === "logs" && "Activity Logs"}
              {activeTab === "settings" && "Geschäfts-Einstellungen"}
              {activeTab === "account" && "Konto-Einstellungen"}
            </h1>
          </div>
          
          {/* Multi-Shop Admin rechts (Desktop) */}
          <div className="flex items-center text-right">
            <p className="text-sm text-muted-foreground hidden md:block">
              Multi-Shop Administration
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto px-0 py-3 md:p-6">
          <ScrollArea className="h-full">
            {activeTab === "dashboard" && <DashboardStats />}
            {activeTab === "shops" && <ShopsOverview />}
            {activeTab === "employees" && <EmployeesOverview />}
            {activeTab === "orders" && <OrdersOverview />}
            {activeTab === "logs" && <LogsOverview />}
            {activeTab === "settings" && <MSABusinessSettings />}
            {activeTab === "account" && <MSAProfileSettings />}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
