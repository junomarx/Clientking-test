import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Smartphone, Menu, X, Settings, User, LogOut, Shield } from "lucide-react";
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

type HeaderProps = {
  variant?: "landing" | "auth" | "app";
};

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href}>
    <span className="text-gray-600 hover:text-primary font-medium cursor-pointer">
      {children}
    </span>
  </Link>
);

export function Header({ variant = "landing" }: HeaderProps) {
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
        <div className="hidden md:flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer mr-6">
              <img src={ClientKingLogo} alt="ClientKing Logo" className="h-10" />
            </div>
          </Link>
          <h1 className="text-xl font-semibold" data-app-title>
            Handyshop Verwaltung
          </h1>
        </div>
        
        {/* Mobile Titel */}
        <div className="flex items-center md:hidden">
          <img src={ClientKingLogo} alt="ClientKing Logo" className="h-8 mr-2" />
          <h1 className="text-lg font-medium" data-app-title>
            Handyshop Verwaltung
          </h1>
        </div>
        
        {/* Benutzerinfo */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">{user.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Benutzermenü</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => {
                const event = new CustomEvent('open-settings-dialog');
                window.dispatchEvent(event);
              }}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Einstellungen</span>
              </DropdownMenuItem>
              
              {user.isAdmin && (
                <Link href="/admin">
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin-Bereich</span>
                  </DropdownMenuItem>
                </Link>
              )}
              
              {user.isSuperadmin && (
                <Link href="/superadmin">
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4 text-red-500" />
                    <span className="text-red-500 font-semibold">Superadmin-Bereich</span>
                  </DropdownMenuItem>
                </Link>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
