import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { User, BusinessSettings } from "@shared/schema";

import SuperadminDashboardTab, { SuperadminContext } from "@/components/superadmin/SuperadminDashboardTab";
import SuperadminUsersTab from "@/components/superadmin/SuperadminUsersTab";
// SuperadminPackagesTab entfernt - Pakete-System wurde deaktiviert
import ResponsiveSuperadminDevicesTab from "@/components/superadmin/ResponsiveSuperadminDevicesTab";
import DeviceStatisticsTab from "@/components/superadmin/DeviceStatisticsTab";
import SuperadminEmailTab from "@/components/superadmin/SuperadminEmailTab";
import SuperadminPrintTemplatesTab from "@/components/superadmin/SuperadminPrintTemplatesTab";
import SuperadminSupportModeTab from "@/components/superadmin/SuperadminSupportModeTab";
import SuperadminAccountTab from "@/components/superadmin/SuperadminAccountTab";
import { MultiShopManagement } from "@/components/multi-shop/MultiShopManagement";

import { SuperadminSidebar } from "@/components/superadmin/SuperadminSidebar";

export default function SuperadminPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // URL-Parameter verarbeiten, um direkt zu einem Tab/User zu springen
  useEffect(() => {
    // URL-Parameter extrahieren
    const params = new URLSearchParams(location.includes('?') ? location.split('?')[1] : '');
    const tabParam = params.get('tab');
    const userIdParam = params.get('userId');
    
    // Tab setzen, wenn in URL vorhanden
    if (tabParam && ['dashboard', 'users', 'packages', 'devices', 'device-statistics', 'email', 'print-templates', 'support-mode', 'account', 'multi-shop'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    // Benutzer-ID setzen, wenn in URL vorhanden
    if (userIdParam && !isNaN(parseInt(userIdParam))) {
      setSelectedUserId(parseInt(userIdParam));
    }
  }, [location]);

  // Benutzer abrufen, um den richtigen Namen anzuzeigen
  const { data: currentUser } = useQuery<User>({ 
    queryKey: ["/api/user"],
  });

  // Geschäftseinstellungen für den Kopfbereich
  const { data: businessSettings } = useQuery<BusinessSettings>({
    queryKey: ["/api/business-settings"],
  });

  // Ausloggen-Funktion
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("auth_token");
      // Alle Query-Caches löschen
      queryClient.clear();
      setLocation("/auth");
      toast({
        title: "Erfolgreich ausgeloggt",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
    } catch (error) {
      console.error("Fehler beim Ausloggen:", error);
      // Auch bei Fehlern den lokalen Zustand löschen
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("auth_token");
      queryClient.clear();
      setLocation("/auth");
      toast({
        variant: "destructive",
        title: "Ausloggen erzwungen",
        description: "Sie wurden lokal abgemeldet.",
      });
    }
  };

  // Seite-Titel aktualisieren
  useEffect(() => {
    document.title = "Superadmin-Bereich | Handyshop Verwaltung";
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Sidebar Komponente */}
      <SuperadminSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        businessSettings={businessSettings}
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
              {activeTab === "users" && "Benutzer"}
              {activeTab === "packages" && "Pakete"}
              {activeTab === "devices" && "Geräte"}
              {activeTab === "device-statistics" && "Statistiken"}
              {activeTab === "email" && "E-Mail"}
              {activeTab === "print-templates" && "Vorlagen"}
              {activeTab === "support-mode" && "Support"}
              {activeTab === "account" && "Konto"}
              {activeTab === "multi-shop" && "Multi-Shop"}

            </h1>
          </div>
          
          {/* Desktop Titel */}
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold">
              {activeTab === "dashboard" && "Superadmin Dashboard"}
              {activeTab === "users" && "Benutzerverwaltung"}
              {activeTab === "packages" && "Paketverwaltung"}
              {activeTab === "devices" && "Geräteverwaltung"}
              {activeTab === "device-statistics" && "Gerätestatistiken"}
              {activeTab === "email" && "E-Mail-Konfiguration"}
              {activeTab === "print-templates" && "Vorlagenverwaltung"}
              {activeTab === "support-mode" && "Support-Modus"}
              {activeTab === "account" && "Konto-Einstellungen"}
              {activeTab === "multi-shop" && "Multi-Shop Verwaltung"}

            </h1>
            {/* Die Benutzerinfo wurde entfernt, da sie bereits in der Sidebar angezeigt wird */}
          </div>
          
          {/* Geschäftsname rechts (Desktop) */}
          <div className="flex items-center text-right">
            <p className="text-sm text-muted-foreground hidden md:block">
              {businessSettings?.businessName || "Handyshop Verwaltung"}
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <ScrollArea className="h-full">
            <SuperadminContext.Provider value={setActiveTab}>
              {activeTab === "dashboard" && <SuperadminDashboardTab />}
              {activeTab === "users" && <SuperadminUsersTab initialSelectedUserId={selectedUserId} />}
              {/* Pakete-Tab entfernt */}
              {activeTab === "devices" && <ResponsiveSuperadminDevicesTab />}
              {activeTab === "device-statistics" && <DeviceStatisticsTab />}
              {activeTab === "email" && <SuperadminEmailTab />}
              {activeTab === "print-templates" && <SuperadminPrintTemplatesTab />}
              {activeTab === "support-mode" && <SuperadminSupportModeTab />}
              {activeTab === "account" && <SuperadminAccountTab />}
              {activeTab === "multi-shop" && <MultiShopManagement />}
            </SuperadminContext.Provider>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
