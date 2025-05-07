import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'wouter';
import { 
  Menu,
  GaugeCircle,
  Users,
  Package,
  Laptop,
  LogOut,
  ChevronLeft,
  Mail,
  FileCode,
  Layout,
  X
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { User, BusinessSettings } from "@shared/schema";

interface SuperadminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: User;
  businessSettings?: BusinessSettings;
  handleLogout: () => void;
}

export function SuperadminSidebar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  businessSettings, 
  handleLogout 
}: SuperadminSidebarProps) {
  
  // Navigationselemente, die in der Sidebar angezeigt werden
  type NavItemsProps = {
    isMobile?: boolean;
    closeMenu?: () => void;
  };

  const NavItems = ({ isMobile = false, closeMenu = () => {} }: NavItemsProps) => (
    <>
      <div className="space-y-1">
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
      </div>
      
      {/* Weitere Kategorien */}
      <div className="mt-6 mb-2">
        <Separator className="mb-2" />
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Einstellungen
        </h3>
      </div>
      <div className="space-y-1">
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
          variant={activeTab === "design-preview" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("design-preview");
            if (isMobile) closeMenu();
          }}
        >
          <Layout className="h-5 w-5 mr-2" />
          Designvorschau
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - nur auf größeren Bildschirmen sichtbar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-muted/20 border-r">
        <ScrollArea className="h-screen">
          <div className="flex flex-col flex-grow pt-5 pb-4">
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
        </ScrollArea>
      </div>

      {/* Mobile Menü - nur auf kleineren Bildschirmen sichtbar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menü öffnen</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="w-full pt-16 pb-10 h-auto max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-left">Superadmin Menü</h2>
              <p className="text-sm text-muted-foreground">
                {businessSettings?.businessName || "Handyshop Verwaltung"}
              </p>
            </div>
            <nav className="flex flex-col space-y-2 px-1">
              <NavItems isMobile={true} closeMenu={() => {
                // Sheet schließen durch Klick auf den close-Button
                document.querySelector('[data-radix-collection-item]')?.dispatchEvent(
                  new MouseEvent('click', { bubbles: true })
                );
              }} />
            </nav>
            <Separator className="my-4" />
            <div className="space-y-2 px-1">              
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
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}