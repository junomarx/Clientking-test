import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, GaugeCircle, Users, Package, Laptop, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

import SuperadminDashboardTab from "@/components/superadmin/SuperadminDashboardTab";
import SuperadminUsersTab from "@/components/superadmin/SuperadminUsersTab";
import SuperadminPackagesTab from "@/components/superadmin/SuperadminPackagesTab";
import SuperadminDevicesTab from "@/components/superadmin/SuperadminDevicesTab";

export default function SuperadminPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Benutzer abrufen, um den richtigen Namen anzuzeigen
  const { data: currentUser } = useQuery({ 
    queryKey: ["/api/user"],
  });

  // Geschäftseinstellungen für den Kopfbereich
  const { data: businessSettings } = useQuery({
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
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-muted/20 border-r">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-semibold text-primary">Superadmin</h1>
          </div>
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <Button 
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <GaugeCircle className="h-5 w-5 mr-2" />
              Dashboard
            </Button>
            <Button 
              variant={activeTab === "users" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="h-5 w-5 mr-2" />
              Benutzer
            </Button>
            <Button 
              variant={activeTab === "packages" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("packages")}
            >
              <Package className="h-5 w-5 mr-2" />
              Pakete
            </Button>
            <Button 
              variant={activeTab === "devices" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("devices")}
            >
              <Laptop className="h-5 w-5 mr-2" />
              Geräte
            </Button>
          </nav>
          <div className="px-2 mt-6">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Ausloggen
            </Button>
            <Button 
              variant="link" 
              className="w-full justify-start mt-2"
              asChild
            >
              <Link to="/app">
                <ChevronLeft className="h-5 w-5 mr-2" />
                Zurück zur App
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="flex justify-between items-center py-4 px-6 bg-background shadow-sm border-b">
          <div>
            <h1 className="text-xl font-semibold">
              {activeTab === "dashboard" && "Superadmin Dashboard"}
              {activeTab === "users" && "Benutzerverwaltung"}
              {activeTab === "packages" && "Paketverwaltung"}
              {activeTab === "devices" && "Geräteverwaltung"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Angemeldet als {currentUser?.username}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {businessSettings?.businessName || "Handyshop Verwaltung"}
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <ScrollArea className="h-full">
            {activeTab === "dashboard" && <SuperadminDashboardTab />}
            {activeTab === "users" && <SuperadminUsersTab />}
            {activeTab === "packages" && <SuperadminPackagesTab />}
            {activeTab === "devices" && <SuperadminDevicesTab />}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
