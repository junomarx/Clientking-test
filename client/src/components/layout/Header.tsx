import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Smartphone, 
  Menu, 
  X, 
  Settings, 
  User, 
  LogOut, 
  Shield,
  LayoutDashboard,
  Wrench,
  Users,
  BarChart2,
  FileText,
  PlusCircle
} from "lucide-react";
import { useState } from "react";
import ClientKingLogo from "../../assets/ClientKing_Logo.png";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type HeaderProps = {
  variant?: "landing" | "auth" | "app";
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  canUseCostEstimates?: boolean;
};

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href}>
    <span className="text-gray-600 hover:text-primary font-medium cursor-pointer">
      {children}
    </span>
  </Link>
);

export function Header({ variant = "landing", activeTab, onTabChange, canUseCostEstimates }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Superadmin-Stil für reguläre App-Ansicht
  if (variant === "app" && user) {
    return (
      <header className="flex justify-between items-center py-3 px-4 md:py-4 md:px-6 bg-background shadow-sm border-b">
        {/* Logo und Titel für Desktop */}
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer mr-6">
              <img src={ClientKingLogo} alt="ClientKing Logo" className="h-10 md:h-10 h-8" />
            </div>
          </Link>
          <h1 className="text-xl font-semibold" data-app-title>
            Handyshop Verwaltung
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Benutzer-Info als Text rechts - nur Desktop */}
          <div className="text-sm text-muted-foreground hidden md:block">
            Angemeldet als: {user.username}
          </div>
          
          {/* Mobile Sidebar-Menü-Button - nur auf kleineren Bildschirmen */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-[90%] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-primary">Handyshop Verwaltung</h2>
                    <p className="text-sm text-muted-foreground">
                      Angemeldet als {user?.username || ""}
                    </p>
                  </div>
                  
                  <nav className="flex-1 p-4 space-y-2">
                    {/* Neuer Auftrag Button */}
                    <Button 
                      variant="default"
                      className="w-full justify-start mb-4 bg-gradient-to-r from-primary to-blue-600"
                      onClick={() => {
                        // Event senden, dass ein neuer Auftrag erstellt werden soll
                        window.dispatchEvent(new CustomEvent('trigger-new-order'));
                        // Schließt das Menü
                        document.body.click();
                      }}
                    >
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Neuer Auftrag
                    </Button>
                    
                    <Button 
                      variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('dashboard');
                        document.body.click(); // Schließt das Menü
                      }}
                    >
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Dashboard
                    </Button>
                    <Button 
                      variant={activeTab === 'repairs' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('repairs');
                        document.body.click(); // Schließt das Menü
                      }}
                    >
                      <Wrench className="h-5 w-5 mr-2" />
                      Reparaturen
                    </Button>
                    <Button 
                      variant={activeTab === 'customers' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('customers');
                        document.body.click(); // Schließt das Menü
                      }}
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Kunden
                    </Button>
                    <Button 
                      variant={activeTab === 'statistics' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('statistics');
                        document.body.click(); // Schließt das Menü
                      }}
                    >
                      <BarChart2 className="h-5 w-5 mr-2" />
                      Statistiken
                    </Button>
                    <Button 
                      variant={activeTab === 'cost-estimates' ? 'default' : 'ghost'}
                      className={`w-full justify-start ${!canUseCostEstimates ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (canUseCostEstimates && onTabChange) {
                          onTabChange('cost-estimates');
                          document.body.click(); // Schließt das Menü
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
                        if (onTabChange) onTabChange('settings');
                        document.body.click(); // Schließt das Menü
                      }}
                    >
                      <Settings className="h-5 w-5 mr-2" />
                      Einstellungen
                    </Button>
                  </nav>
                  
                  <div className="p-4 border-t">
                    {/* Login als Superadmin Macnphone - nur anzeigen für Admins und Superadmins */}
                    {user && (user.isAdmin || user.isSuperadmin) && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start mb-2 bg-red-50 hover:bg-red-100 border-red-200"
                        onClick={() => {
                          window.location.href = "/auth?superadmin=true";
                          document.body.click(); // Schließt das Menü
                        }}
                      >
                        <Shield className="h-5 w-5 mr-2 text-red-500" />
                        <span className="text-red-500 font-medium">Login als macnphone</span>
                      </Button>
                    )}
                    
                    {/* Admin-Bereich-Button */}
                    {user && user.isAdmin && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start mb-2"
                        onClick={() => {
                          window.location.href = "/admin";
                          document.body.click(); // Schließt das Menü
                        }}
                      >
                        <Shield className="h-5 w-5 mr-2" />
                        Admin-Bereich
                      </Button>
                    )}
                    
                    {/* Superadmin-Bereich-Button */}
                    {user && user.isSuperadmin && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start mb-2"
                        onClick={() => {
                          window.location.href = "/superadmin";
                          document.body.click(); // Schließt das Menü
                        }}
                      >
                        <Shield className="h-5 w-5 mr-2 text-red-500" />
                        <span className="text-red-500">Superadmin</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        handleLogout();
                        document.body.click(); // Schließt das Menü
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Ausloggen
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  // Original Styling für Landing und Auth-Seiten
  return (
    <header className="w-full bg-white shadow-sm py-4 px-4 md:px-6">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <img src={ClientKingLogo} alt="ClientKing Logo" className="h-12" />
          </div>
        </Link>

        {/* Mobile menu button */}
        <button onClick={toggleMenu} className="md:hidden">
          {menuOpen ? (
            <X className="h-6 w-6 text-gray-500" />
          ) : (
            <Menu className="h-6 w-6 text-gray-500" />
          )}
        </button>

        {/* Nav for desktop */}
        <nav className="hidden md:flex items-center space-x-6">
          {variant === "landing" && (
            <>
              <NavLink href="/">Home</NavLink>
              <NavLink href="/#features">Features</NavLink>
              <NavLink href="/#pricing">Preise</NavLink>
              <Link href="/auth">
                <Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
                  Login
                </Button>
              </Link>
            </>
          )}

          {variant === "auth" && (
            <>
              <NavLink href="/">Home</NavLink>
              <NavLink href="/#features">Features</NavLink>
              <NavLink href="/#pricing">Preise</NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-md p-4 z-50">
          <nav className="flex flex-col space-y-4">
            {variant === "landing" && (
              <>
                <NavLink href="/">Home</NavLink>
                <NavLink href="/#features">Features</NavLink>
                <NavLink href="/#pricing">Preise</NavLink>
                <Link href="/auth">
                  <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
                    Login
                  </Button>
                </Link>
              </>
            )}

            {variant === "auth" && (
              <>
                <NavLink href="/">Home</NavLink>
                <NavLink href="/#features">Features</NavLink>
                <NavLink href="/#pricing">Preise</NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
