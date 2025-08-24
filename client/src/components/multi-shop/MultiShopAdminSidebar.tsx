import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Link } from 'wouter';
import { 
  Menu,
  BarChart3,
  Building2,
  Users,
  Package,
  Activity,
  LogOut,
  ChevronLeft,
  Settings,
  UserCog,
  X
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { User } from "@shared/schema";

interface MultiShopAdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: User;
  handleLogout: () => void;
}

export function MultiShopAdminSidebar({ 
  activeTab, 
  setActiveTab, 
  currentUser,
  handleLogout 
}: MultiShopAdminSidebarProps) {
  
  // Ref für Sheet-Komponente
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Funktion zum Schließen des Menüs
  const closeSheetMenu = () => {
    setSheetOpen(false);
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
          <BarChart3 className="h-5 w-5 mr-2" />
          Dashboard
        </Button>
        <Button 
          variant={activeTab === "shops" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("shops");
            if (isMobile) closeMenu();
          }}
        >
          <Building2 className="h-5 w-5 mr-2" />
          Shops
        </Button>
        <Button 
          variant={activeTab === "employees" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("employees");
            if (isMobile) closeMenu();
          }}
        >
          <Users className="h-5 w-5 mr-2" />
          Mitarbeiter
        </Button>
        <Button 
          variant={activeTab === "orders" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("orders");
            if (isMobile) closeMenu();
          }}
        >
          <Package className="h-5 w-5 mr-2" />
          Bestellungen
        </Button>
        <Button 
          variant={activeTab === "logs" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("logs");
            if (isMobile) closeMenu();
          }}
        >
          <Activity className="h-5 w-5 mr-2" />
          Logs
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
          variant={activeTab === "settings" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("settings");
            if (isMobile) closeMenu();
          }}
        >
          <Settings className="h-5 w-5 mr-2" />
          Geschäft
        </Button>
        <Button 
          variant={activeTab === "account" ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
            setActiveTab("account");
            if (isMobile) closeMenu();
          }}
        >
          <UserCog className="h-5 w-5 mr-2" />
          Konto
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
            <h1 className="text-xl font-semibold text-primary">Multi-Shop Admin</h1>
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
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 md:hidden z-10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Menü öffnen</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] pt-16 pb-10 h-full max-h-screen overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-left">
                {currentUser ? `${currentUser.username} Menü` : 'Multi-Shop Admin Menü'}
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
                  closeSheetMenu();
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
                onClick={() => closeSheetMenu()}
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