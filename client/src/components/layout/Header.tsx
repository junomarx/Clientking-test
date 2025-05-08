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
  PlusCircle,
  Building,
  Mail,
  Printer,
  CreditCard,
  UserCog
} from "lucide-react";
import { useRef, useState } from "react";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
          {/* Desktop - keine Benutzerinfo mehr hier, da jetzt in der Sidebar */}
          
          {/* Mobile Menü Button - zeigt das Dropdown Menü an */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Mobile Dropdown Menü, von oben kommend */}
            {menuOpen && (
              <div className="fixed inset-x-0 top-14 bg-white shadow-lg z-50 animate-in slide-in-from-top duration-300">
                <div className="flex flex-col max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-primary">Handyshop Verwaltung</h2>
                      <Button variant="ghost" size="icon" onClick={toggleMenu}>
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    {/* Die Benutzerinfo wurde entfernt, da sie jetzt in der Sidebar angezeigt wird */}
                  </div>
                  
                  <nav className="flex-1 p-4 space-y-2">
                    {/* Neuer Auftrag Button */}
                    <Button 
                      variant="default"
                      className="w-full justify-start mb-4 bg-gradient-to-r from-primary to-blue-600"
                      onClick={() => {
                        // Event senden, dass ein neuer Auftrag erstellt werden soll
                        window.dispatchEvent(new CustomEvent('trigger-new-order'));
                        setMenuOpen(false);
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
                        setMenuOpen(false);
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
                        setMenuOpen(false);
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
                        setMenuOpen(false);
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
                        setMenuOpen(false);
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
                          setMenuOpen(false);
                        }
                      }}
                      disabled={!canUseCostEstimates}
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Kostenvoranschläge
                    </Button>
                    {/* Einstellungskategorie mit Unterpunkten */}
                    <div className="mt-2 mb-1">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Einstellungen
                      </h3>
                    </div>
                    <Button 
                      variant={activeTab === 'business-settings' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('business-settings');
                        setMenuOpen(false);
                      }}
                    >
                      <Building className="h-5 w-5 mr-2" />
                      Geschäft
                    </Button>
                    <Button 
                      variant={activeTab === 'email-settings' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('email-settings');
                        setMenuOpen(false);
                      }}
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      E-Mail
                    </Button>
                    <Button 
                      variant={activeTab === 'print-settings' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('print-settings');
                        setMenuOpen(false);
                      }}
                    >
                      <Printer className="h-5 w-5 mr-2" />
                      Drucken
                    </Button>
                    <Button 
                      variant={activeTab === 'subscription-settings' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('subscription-settings');
                        setMenuOpen(false);
                      }}
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Abonnement
                    </Button>
                    <Button 
                      variant={activeTab === 'user-settings' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        if (onTabChange) onTabChange('user-settings');
                        setMenuOpen(false);
                      }}
                    >
                      <UserCog className="h-5 w-5 mr-2" />
                      Benutzerdaten
                    </Button>
                  </nav>
                  
                  <div className="p-4 border-t">
                    {/* Login als Superadmin Macnphone - nur anzeigen für Admins und Superadmins */}
                    {user && (user.isAdmin || user.isSuperadmin) && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start mb-2 bg-red-50 hover:bg-red-100 border-red-200"
                        onClick={() => {
                          setMenuOpen(false);
                          window.location.href = "/auth?superadmin=true";
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
                          setMenuOpen(false);
                          window.location.href = "/admin";
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
                          setMenuOpen(false);
                          window.location.href = "/superadmin";
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
                        setMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Ausloggen
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
