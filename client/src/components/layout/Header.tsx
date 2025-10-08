import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User, Settings } from 'lucide-react';
import { BusinessSettingsDialog } from '@/components/settings';

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="bg-gradient-to-r from-primary to-secondary py-6 px-6 flex justify-between items-center">
      <h1 className="text-white text-xl md:text-2xl font-semibold flex items-center gap-2">
        <span className="text-2xl">📱</span> 
        Handyshop Verwaltungssystem
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
