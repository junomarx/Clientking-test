import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { User, BusinessSettings } from "@shared/schema";

import SuperadminDashboardTab from "@/components/superadmin/SuperadminDashboardTab";
import SuperadminUsersTab from "@/components/superadmin/SuperadminUsersTab";
import SuperadminPackagesTab from "@/components/superadmin/SuperadminPackagesTab";
import SuperadminDevicesTab from "@/components/superadmin/SuperadminDevicesTab";
import SuperadminEmailTab from "@/components/superadmin/SuperadminEmailTab";
import SuperadminPrintTemplatesTab from "@/components/superadmin/SuperadminPrintTemplatesTab";
import SuperadminShopsPreview from "@/components/superadmin/SuperadminShopsPreview";
import { SuperadminSidebar } from "@/components/superadmin/SuperadminSidebar";

// Settings Komponenten
import { BusinessSettingsTab } from "@/components/settings/BusinessSettingsTab";
import { PrintSettingsTab } from "@/components/settings/PrintSettingsTab";
import { SubscriptionSettingsTab } from "@/components/settings/SubscriptionSettingsTab";
import { UserSettingsTab } from "@/components/settings/UserSettingsTab";

export default function SuperadminPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

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
      setLocation("/auth");
      toast({
        title: "Erfolgreich ausgeloggt",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
    } catch (error) {
      console.error("Fehler beim Ausloggen:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Ausloggen",
        description: "Bitte versuchen Sie es erneut.",
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
              {activeTab === "business-settings" && "Geschäft"}
              {activeTab === "email" && "E-Mail"}
              {activeTab === "print-settings" && "Drucken"}
              {activeTab === "subscription-settings" && "Abonnement"}
              {activeTab === "user-settings" && "Benutzerdaten"}
              {activeTab === "design-preview" && "Designvorschau"}
            </h1>
          </div>
          
          {/* Desktop Titel */}
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold">
              {activeTab === "dashboard" && "Superadmin Dashboard"}
              {activeTab === "users" && "Benutzerverwaltung"}
              {activeTab === "packages" && "Paketverwaltung"}
              {activeTab === "devices" && "Geräteverwaltung"}
              {activeTab === "business-settings" && "Geschäftseinstellungen"}
              {activeTab === "email" && "E-Mail-Konfiguration"}
              {activeTab === "print-settings" && "Druckeinstellungen"}
              {activeTab === "subscription-settings" && "Abonnementverwaltung"}
              {activeTab === "user-settings" && "Benutzereinstellungen"}
              {activeTab === "design-preview" && "Benutzeroberfläche Vorschau"}
            </h1>
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
            {activeTab === "dashboard" && <SuperadminDashboardTab />}
            {activeTab === "users" && <SuperadminUsersTab />}
            {activeTab === "packages" && <SuperadminPackagesTab />}
            {activeTab === "devices" && <SuperadminDevicesTab />}
            {activeTab === "email" && <SuperadminEmailTab />}
            {activeTab === "print-templates" && <SuperadminPrintTemplatesTab />}
            {activeTab === "design-preview" && <SuperadminShopsPreview />}
            
            {/* Einstellungs-Tabs */}
            {activeTab === "business-settings" && <BusinessSettingsTab />}
            {activeTab === "print-settings" && <PrintSettingsTab />}
            {activeTab === "subscription-settings" && <SubscriptionSettingsTab />}
            {activeTab === "user-settings" && <UserSettingsTab />}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
