import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'wouter';
import { 
  Menu,
  LayoutDashboard,
  Wrench,
  Users,
  BarChart2,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Shield,
  PlusCircle,
  Building,
  Building2,
  Mail,
  Printer,
  Package,
  UserCog,
  CreditCard,
  User,
  Tablet
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { KioskActivationButton } from '@/components/kiosk/KioskActivationButton';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [canViewStats, setCanViewStats] = useState(false);
  
  // Query für die Anzahl der zu bestellenden Artikel
  const { data: orderCounts } = useQuery({
    queryKey: ['/api/orders/counts'],
    enabled: !!user,
    refetchInterval: 30000, // Aktualisiere alle 30 Sekunden
  });
  
  const handleLogout = () => {
    console.log("🖱️ Logout-Button geklickt in Sidebar");
    console.log("🔍 Logout-Mutation Status:", logoutMutation.status);
    logoutMutation.mutate();
    console.log("🚀 Logout-Mutation aufgerufen");
  };

  // Prüfung der Statistik-Berechtigung
  useEffect(() => {
    const checkStatsPermission = async () => {
      try {
        const response = await fetch('/api/can-view-detailed-stats');
        if (response.ok) {
          const data = await response.json();
          setCanViewStats(data.canViewDetailedStats);
        }
      } catch (error) {
        setCanViewStats(false);
      }
    };
    
    if (user) {
      checkStatsPermission();
    }
  }, [user]);

  // Navigationselemente, die in der Sidebar angezeigt werden
  type NavItemsProps = {
    isMobile?: boolean;
    closeMenu?: () => void;
  };

  const NavItems = ({ isMobile = false, closeMenu = () => {} }: NavItemsProps) => (
    <>
      {/* Neuer Auftrag Button */}
      <Button 
        variant="default"
        className="w-full justify-start mb-4 bg-gradient-to-r from-primary to-blue-600"
        onClick={() => {
          // Event senden, dass ein neuer Auftrag erstellt werden soll
          window.dispatchEvent(new CustomEvent('trigger-new-order'));
        }}
      >
        <PlusCircle className="h-5 w-5 mr-2" />
        Neuer Auftrag
      </Button>
      
      {/* Hauptnavigation - Statistiken komplett entfernt */}
      <div className="space-y-1" data-stats-removed="true">
        <Button 
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('dashboard');
            if (isMobile) closeMenu();
          }}
        >
          <LayoutDashboard className="h-5 w-5 mr-2" />
          Dashboard
        </Button>
        <Button 
          variant={activeTab === 'repairs' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('repairs');
            if (isMobile) closeMenu();
          }}
        >
          <Wrench className="h-5 w-5 mr-2" />
          Reparaturen
        </Button>
        <Button 
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          className="w-full justify-start relative"
          onClick={() => {
            onTabChange('orders');
            if (isMobile) closeMenu();
          }}
        >
          <Package className="h-5 w-5 mr-2" />
          Bestellungen
          {orderCounts && orderCounts.totalToOrder > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-auto text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center font-bold"
            >
              !
            </Badge>
          )}
        </Button>
        <Button 
          variant={activeTab === 'customers' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('customers');
            if (isMobile) closeMenu();
          }}
        >
          <Users className="h-5 w-5 mr-2" />
          Kunden
        </Button>
        <Button 
          variant={activeTab === 'cost-estimates' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('cost-estimates');
            if (isMobile) closeMenu();
          }}
        >
          <FileText className="h-5 w-5 mr-2" />
          Kostenvoranschläge
        </Button>
        <Button 
          variant={activeTab === 'loaner-devices' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('loaner-devices');
            if (isMobile) closeMenu();
          }}
        >
          <Tablet className="h-5 w-5 mr-2" />
          Leihgeräte
        </Button>
        {/* STATISTIKEN KOMPLETT ENTFERNT - CACHE REFRESH ERZWUNGEN v3 */}
      </div>
      
      {/* Einstellungen Kategorie */}
      <div className="mt-6 mb-2">
        <Separator className="mb-2" />
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Einstellungen
        </h3>
      </div>
      <div className="space-y-1">
        {/* Geschäft - nur für Shop-Owner */}
        {user && user.role === 'owner' && (
          <Button 
            variant={activeTab === 'business-settings' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onTabChange('business-settings');
              if (isMobile) closeMenu();
            }}
          >
            <Building className="h-5 w-5 mr-2" />
            Geschäft
          </Button>
        )}
        
        {/* E-Mail - nur für Shop-Owner */}
        {user && user.role === 'owner' && (
          <Button 
            variant={activeTab === 'email-settings' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onTabChange('email-settings');
              if (isMobile) closeMenu();
            }}
          >
            <Mail className="h-5 w-5 mr-2" />
            E-Mail
          </Button>
        )}
        
        {/* Drucken - nur für Shop-Owner */}
        {user && user.role === 'owner' && (
          <Button 
            variant={activeTab === 'print-settings' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onTabChange('print-settings');
              if (isMobile) closeMenu();
            }}
          >
            <Printer className="h-5 w-5 mr-2" />
            Drucken
          </Button>
        )}
        
        {/* Abonnement - nur für Shop-Owner */}
        {user && user.role === 'owner' && (
          <Button 
            variant={activeTab === 'subscription-settings' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onTabChange('subscription-settings');
              if (isMobile) closeMenu();
            }}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Abonnement
          </Button>
        )}
        <Button 
          variant={activeTab === 'user-settings' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('user-settings');
            if (isMobile) closeMenu();
          }}
        >
          <UserCog className="h-5 w-5 mr-2" />
          Benutzerdaten
        </Button>
        
        {/* Mitarbeiterverwaltung - nur für Shop-Owner */}
        {user && user.role === 'owner' && (
          <Button 
            variant={activeTab === 'employees' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onTabChange('employees');
              if (isMobile) closeMenu();
            }}
          >
            <User className="h-5 w-5 mr-2" />
            Mitarbeiter
          </Button>
        )}
        
        {/* Multi-Shop-Admin Verwaltung - nur für Shop-Owner mit Berechtigung */}
        {user && user.role === 'owner' && user.canAssignMultiShopAdmins && (
          <Button 
            variant={activeTab === 'multi-shop-admin' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onTabChange('multi-shop-admin');
              if (isMobile) closeMenu();
            }}
          >
            <Building2 className="h-5 w-5 mr-2" />
            Multishop-Admin
          </Button>
        )}
        
        {/* Kiosk-Modus Aktivierung - nur für Kiosk-Mitarbeiter */}
        {user && user.role === 'kiosk' && (
          <div className="pt-2 border-t">
            <KioskActivationButton />
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - nur auf größeren Bildschirmen sichtbar */}
      <div className="hidden md:flex md:w-64 md:h-screen md:flex-col bg-muted/20 border-r overflow-y-auto">
        <div className="flex flex-col w-full pt-5 pb-4">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-semibold text-primary">
              {user ? user.username : 'Handyshop'}
            </h1>
          </div>
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <NavItems />
          </nav>
          <div className="px-2 mt-6 mb-4">
            {/* Multi-Shop-Admin-Bereich-Button */}
            {user && user.isMultiShopAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start mb-2"
                asChild
              >
                <Link href="/multi-shop-admin">
                  <Shield className="h-5 w-5 mr-2 text-blue-500" />
                  <span className="text-blue-500">Multi-Shop Admin</span>
                </Link>
              </Button>
            )}
            
            {/* Superadmin-Bereich-Button */}
            {user && user.isSuperadmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start mb-2"
                asChild
              >
                <Link href="/superadmin">
                  <Shield className="h-5 w-5 mr-2 text-red-500" />
                  <span className="text-red-500">Superadmin</span>
                </Link>
              </Button>
            )}
            

            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Ausloggen
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
                {user ? `${user.username} Menü` : 'Handyshop Menü'}
              </h2>
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
              {/* Multi-Shop-Admin-Bereich-Button für Mobile */}
              {user && user.isMultiShopAdmin && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start mb-2"
                  asChild
                >
                  <Link href="/multi-shop-admin">
                    <Shield className="h-5 w-5 mr-2 text-blue-500" />
                    <span className="text-blue-500">Multi-Shop Admin</span>
                  </Link>
                </Button>
              )}
              
              {/* Multi-Shop-Bereich-Button für Mobile */}
              {user && user.canAssignMultiShopAdmins && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start mb-2"
                  asChild
                >
                  <Link href="/multi-shop">
                    <Building2 className="h-5 w-5 mr-2 text-purple-600" />
                    <span className="text-purple-600">Multi-Shop</span>
                  </Link>
                </Button>
              )}
              
              {/* Superadmin-Bereich-Button */}
              {user && user.isSuperadmin && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start mb-2"
                  asChild
                >
                  <Link href="/superadmin">
                    <Shield className="h-5 w-5 mr-2 text-red-500" />
                    <span className="text-red-500">Superadmin</span>
                  </Link>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600" 
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Ausloggen
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}