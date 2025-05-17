import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
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
  X,
  ShieldAlert
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
  
  // Ref für Sheet-Komponente
  const sheetCloseRef = useRef<HTMLButtonElement>(null);

  // Funktion zum Schließen des Menüs
  const closeSheetMenu = () => {
    // Verwenden wir die Standard-DOM-Selektion, da die Ref nicht zuverlässig ist
    const closeBtn = document.querySelector('button[aria-label="Close"]');
    if (closeBtn instanceof HTMLElement) {
      closeBtn.click();
    }
  };

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
          variant={activeTab === "support-mode" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("support-mode");
            if (isMobile) closeMenu();
          }}
        >
          <ShieldAlert className="h-5 w-5 mr-2" />
          Support-Modus
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - nur auf größeren Bildschirmen sichtbar */}
      <div className="hidden md:flex md:w-64 md:h-screen md:flex-col bg-muted/20 border-r overflow-y-auto">
        <div className="flex flex-col w-full pt-5 pb-4">
          <div className="flex flex-col flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-semibold text-primary">Superadmin</h1>
            <p className="text-sm text-muted-foreground">{currentUser?.username || ""}</p>
          </div>
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <NavItems />
          </nav>
          <div className="px-2 mt-6 mb-4">
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

      {/* Mobile Menü - nur auf kleineren Bildschirmen sichtbar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Menü öffnen</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="w-full pt-16 pb-10 h-auto max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-left">
                {currentUser ? `${currentUser.username} Menü` : 'Superadmin Menü'}
              </h2>
            </div>
            <nav className="flex flex-col space-y-2 px-1">
              <NavItems isMobile={true} closeMenu={closeSheetMenu} />
            </nav>
            <Separator className="my-4" />
            <div className="space-y-2 px-1">
              <Button 
                variant="outline" 
                className="w-full justify-start mb-2"
                onClick={() => {
                  // Menü schließen und dann ausloggen
                  closeSheetMenu();
                  // Nach kurzer Verzögerung ausloggen
                  setTimeout(handleLogout, 100);
                }}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Ausloggen
              </Button>
              <Button 
                variant="link" 
                className="w-full justify-start"
                asChild
                onClick={() => {
                  // Auch das Menü schließen, wenn der Link geklickt wird
                  setTimeout(() => closeSheetMenu(), 100);
                }}
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