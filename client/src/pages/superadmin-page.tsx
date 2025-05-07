import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, GaugeCircle, Users, Package, Laptop, LogOut, Building, Menu, X, Mail, FileCode, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { User, BusinessSettings } from "@shared/schema";

import SuperadminDashboardTab from "@/components/superadmin/SuperadminDashboardTab";
import SuperadminUsersTab from "@/components/superadmin/SuperadminUsersTab";
import SuperadminPackagesTab from "@/components/superadmin/SuperadminPackagesTab";
import SuperadminDevicesTab from "@/components/superadmin/SuperadminDevicesTab";
import SuperadminEmailTab from "@/components/superadmin/SuperadminEmailTab";
import SuperadminPrintTemplatesTab from "@/components/superadmin/SuperadminPrintTemplatesTab";
import SuperadminShopsPreview from "@/components/superadmin/SuperadminShopsPreview";

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

  // Navigationstypen und -elemente
  type NavItemsProps = {
    isMobile?: boolean;
    closeMenu?: () => void;
  };
  
  // Navigationselemente, die sowohl in der Desktop-Seitenleiste als auch im mobilen Menü verwendet werden
  const NavItems = ({ isMobile = false, closeMenu = () => {} }: NavItemsProps) => (
    <>
      <Button 
        variant={activeTab === "dashboard" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("dashboard");
          if (isMobile) closeMenu();
        }}
      >
        <GaugeCircle className="h-5 w-5 mr-2" />
        Dashboard
      </Button>
      <Button 
        variant={activeTab === "users" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("users");
          if (isMobile) closeMenu();
        }}
      >
        <Users className="h-5 w-5 mr-2" />
        Benutzer
      </Button>
      <Button 
        variant={activeTab === "packages" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("packages");
          if (isMobile) closeMenu();
        }}
      >
        <Package className="h-5 w-5 mr-2" />
        Pakete
      </Button>
      <Button 
        variant={activeTab === "devices" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("devices");
          if (isMobile) closeMenu();
        }}
      >
        <Laptop className="h-5 w-5 mr-2" />
        Geräte
      </Button>
      <Button 
        variant={activeTab === "email" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("email");
          if (isMobile) closeMenu();
        }}
      >
        <Mail className="h-5 w-5 mr-2" />
        E-Mail
      </Button>
      <Button 
        variant={activeTab === "print-templates" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("print-templates");
          if (isMobile) closeMenu();
        }}
      >
        <FileCode className="h-5 w-5 mr-2" />
        Vorlagen
      </Button>
      <Button 
        variant={activeTab === "shops" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => {
          setActiveTab("shops");
          if (isMobile) closeMenu();
        }}
      >
        <Store className="h-5 w-5 mr-2" />
        Shops
      </Button>

    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-muted/20 border-r">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-semibold text-primary">Superadmin</h1>
          </div>
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <NavItems />
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
        {/* Top header - Mobile und Desktop */}
        <header className="flex justify-between items-center py-3 px-4 md:py-4 md:px-6 bg-background shadow-sm border-b">
          {/* Mobile Menü */}
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-primary">Superadmin</h2>
                    <p className="text-sm text-muted-foreground">
                      {businessSettings && businessSettings.businessName || "Handyshop Verwaltung"}
                    </p>
                  </div>
                  
                  <nav className="flex-1 p-4 space-y-2">
                    <NavItems isMobile closeMenu={() => document.body.click()} />
                  </nav>
                  
                  <div className="p-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start mb-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Ausloggen
                    </Button>
                    <Button 
                      variant="link" 
                      className="w-full justify-start"
                      asChild
                    >
                      <Link to="/app">
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Zurück zur App
                      </Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-medium">
              {activeTab === "dashboard" && "Dashboard"}
              {activeTab === "users" && "Benutzer"}
              {activeTab === "packages" && "Pakete"}
              {activeTab === "devices" && "Geräte"}
              {activeTab === "email" && "E-Mail"}
              {activeTab === "print-templates" && "Vorlagen"}
              {activeTab === "shops" && "Shops"}
            </h1>
          </div>
          
          {/* Desktop Titel */}
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold">
              {activeTab === "dashboard" && "Superadmin Dashboard"}
              {activeTab === "users" && "Benutzerverwaltung"}
              {activeTab === "packages" && "Paketverwaltung"}
              {activeTab === "devices" && "Geräteverwaltung"}
              {activeTab === "email" && "E-Mail-Konfiguration"}
              {activeTab === "print-templates" && "Vorlagenverwaltung"}
              {activeTab === "shops" && "Shop Vorschau"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Angemeldet als {currentUser && currentUser.username || ""}
            </p>
          </div>
          
          {/* Benutzerinfo (Desktop rechts, Mobile ganz) */}
          <div className="flex items-center text-right">
            <p className="text-sm text-muted-foreground md:hidden">
              {currentUser && currentUser.username || ""}
            </p>
            <p className="text-sm text-muted-foreground hidden md:block">
              {businessSettings && businessSettings.businessName || "Handyshop Verwaltung"}
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
            {activeTab === "shops" && <SuperadminShopsPreview />}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
