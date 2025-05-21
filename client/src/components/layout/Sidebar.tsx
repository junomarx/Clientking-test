import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
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
  Mail,
  Printer,
  Package,
  UserCog,
  CreditCard,
  User
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
      
      {/* Hauptnavigation */}
      <div className="space-y-1">
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
          variant={activeTab === 'statistics' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => {
            onTabChange('statistics');
            if (isMobile) closeMenu();
          }}
        >
          <BarChart2 className="h-5 w-5 mr-2" />
          Statistiken
        </Button>
      </div>
      
      {/* Einstellungen Kategorie */}
      <div className="mt-6 mb-2">
        <Separator className="mb-2" />
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Einstellungen
        </h3>
      </div>
      <div className="space-y-1">
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
            {/* Admin-Bereich-Button */}
            {user && user.isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start mb-2"
                asChild
              >
                <Link href="/admin">
                  <Shield className="h-5 w-5 mr-2" />
                  Admin-Bereich
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
              {/* Admin-Bereich-Button */}
              {user && user.isAdmin && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start mb-2"
                  asChild
                >
                  <Link href="/admin">
                    <Shield className="h-5 w-5 mr-2" />
                    Admin-Bereich
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