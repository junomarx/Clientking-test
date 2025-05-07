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
  Shield
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  canUseCostEstimates: boolean;
}

export function Sidebar({ activeTab, onTabChange, canUseCostEstimates }: SidebarProps) {
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
      <Button 
        variant={activeTab === 'cost-estimates' ? 'default' : 'ghost'}
        className={`w-full justify-start ${!canUseCostEstimates ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (canUseCostEstimates) {
            onTabChange('cost-estimates');
            if (isMobile) closeMenu();
          }
        }}
        disabled={!canUseCostEstimates}
      >
        <FileText className="h-5 w-5 mr-2" />
        Kostenvoranschläge
      </Button>
      <Button 
        variant={activeTab === 'settings' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => {
          onTabChange('settings');
          if (isMobile) closeMenu();
        }}
      >
        <Settings className="h-5 w-5 mr-2" />
        Einstellungen
      </Button>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - nur auf größeren Bildschirmen sichtbar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-muted/20 border-r">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-semibold text-primary">Handyshop</h1>
          </div>
          <nav className="mt-2 flex-1 px-2 space-y-1">
            <NavItems />
          </nav>
          <div className="px-2 mt-6">
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

      {/* Mobile Menü-Button - nur auf kleineren Bildschirmen sichtbar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-primary">Handyshop Verwaltung</h2>
                <p className="text-sm text-muted-foreground">
                  Angemeldet als {user?.username || ""}
                </p>
              </div>
              
              <nav className="flex-1 p-4 space-y-2">
                <NavItems isMobile closeMenu={() => document.body.click()} />
              </nav>
              
              <div className="p-4 border-t">
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
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}