import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User, Settings } from 'lucide-react';
import { BusinessSettingsDialog } from '@/components/settings';
import { useTheme } from '@/hooks/use-theme';

export function Header() {
  const { user, logoutMutation } = useAuth();
  const { companyName } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [appTitle, setAppTitle] = useState("Handyshop Verwaltungssystem");
  
  // Aktualisiere den angezeigten Titel, wenn sich der Firmenname ändert
  useEffect(() => {
    if (companyName) {
      setAppTitle(companyName);
    }
  }, [companyName]);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="bg-primary py-6 px-6 flex justify-between items-center">
      <h1 className="text-white text-xl md:text-2xl font-semibold flex items-center gap-2">
        <span className="text-2xl">📱</span> 
        <span data-app-title>{appTitle}</span>
      </h1>
      
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white">
            <User size={18} />
            <span className="hidden md:inline">{user.username}</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={16} className="mr-1" />
            <span className="hidden sm:inline">Einstellungen</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              "Abmelden..."
            ) : (
              <>
                <LogOut size={16} className="mr-1" />
                <span className="hidden sm:inline">Abmelden</span>
              </>
            )}
          </Button>
          
          {/* Business Settings Dialog */}
          <BusinessSettingsDialog 
            open={showSettings} 
            onClose={() => setShowSettings(false)} 
          />
        </div>
      )}
    </div>
  );
}
