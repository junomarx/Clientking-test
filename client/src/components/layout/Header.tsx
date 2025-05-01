import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Smartphone, Menu, X, Settings, User, LogOut, Shield } from "lucide-react";
import { useState } from "react";
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

  return (
    <header className="w-full bg-white shadow-sm py-4 px-4 md:px-6">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and App name */}
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-blue-500 flex items-center justify-center mr-3">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Handyshop</h1>
              <p className="text-xs text-gray-500">Verwaltung</p>
            </div>
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
          
          {variant === "app" && user && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{user.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Benutzermenü</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => {
                    // Einstellungsdialog öffnen indem wir ein benutzerdefiniertes Event auslösen
                    const event = new CustomEvent('open-settings-dialog');
                    console.log("Öffne Einstellungsdialog über Event");
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
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Abmelden</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            
            {variant === "app" && user && (
              <>
                <div className="py-2 px-3 mb-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">{user.username}</span>
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={() => {
                    // Einstellungsdialog öffnen indem wir ein benutzerdefiniertes Event auslösen
                    const event = new CustomEvent('open-settings-dialog');
                    console.log("Öffne Einstellungsdialog über Event (mobil)");
                    window.dispatchEvent(event);
                    // Menü schließen
                    setMenuOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Einstellungen</span>
                </div>
                
                {user.isAdmin && (
                  <Link href="/admin">
                    <div className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                      <Shield className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Admin-Bereich</span>
                    </div>
                  </Link>
                )}
                
                <div 
                  className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer text-red-500"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Abmelden</span>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
