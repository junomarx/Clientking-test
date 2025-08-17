import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './use-auth';

interface MultiShopContextType {
  multiShopAdminMode: boolean;
  selectedShopId: number | null;
  selectedShopName: string | null;
  isMultiShopAdmin: boolean;
  enterShopMode: (shopId: number, shopName: string) => void;
  exitShopMode: () => void;
}

const MultiShopContext = createContext<MultiShopContextType | null>(null);

export function MultiShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [multiShopAdminMode, setMultiShopAdminMode] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [selectedShopName, setSelectedShopName] = useState<string | null>(null);

  useEffect(() => {
    // Multi-Shop Modus aus localStorage wiederherstellen
    const isMultiShopMode = localStorage.getItem('multiShopAdminMode') === 'true';
    const shopId = localStorage.getItem('multiShopAdminSelectedShop');
    const shopName = localStorage.getItem('multiShopAdminSelectedShopName');
    
    if (isMultiShopMode && shopId && user?.isMultiShopAdmin) {
      console.log(`🔧 DSGVO-konform: Multi-Shop Modus wiederhergestellt für Shop ${shopId}`);
      setMultiShopAdminMode(true);
      setSelectedShopId(parseInt(shopId));
      setSelectedShopName(shopName || `Shop ${shopId}`);
    }
  }, [user]);

  const enterShopMode = (shopId: number, shopName: string) => {
    if (!user?.isMultiShopAdmin) {
      console.error('Nur Multi-Shop Admins können den Shop-Modus aktivieren');
      return;
    }
    
    console.log(`🌐 DSGVO-konform: Aktiviere Shop-Modus für Shop ${shopId} (${shopName})`);
    
    // Persistieren im localStorage
    localStorage.setItem('multiShopAdminMode', 'true');
    localStorage.setItem('multiShopAdminSelectedShop', shopId.toString());
    localStorage.setItem('multiShopAdminSelectedShopName', shopName);
    
    // State aktualisieren
    setMultiShopAdminMode(true);
    setSelectedShopId(shopId);
    setSelectedShopName(shopName);
    
    // Titel aktualisieren
    document.title = `${shopName} - Handyshop Verwaltung`;
  };

  const exitShopMode = () => {
    console.log('🔙 Multi-Shop Modus beenden');
    
    // localStorage leeren
    localStorage.removeItem('multiShopAdminMode');
    localStorage.removeItem('multiShopAdminSelectedShop');
    localStorage.removeItem('multiShopAdminSelectedShopName');
    
    // State zurücksetzen
    setMultiShopAdminMode(false);
    setSelectedShopId(null);
    setSelectedShopName(null);
    
    // Titel zurücksetzen
    document.title = 'Handyshop Verwaltung';
  };

  return (
    <MultiShopContext.Provider value={{
      multiShopAdminMode,
      selectedShopId,
      selectedShopName,
      isMultiShopAdmin: !!user?.isMultiShopAdmin,
      enterShopMode,
      exitShopMode
    }}>
      {children}
    </MultiShopContext.Provider>
  );
}

export function useMultiShop() {
  const context = useContext(MultiShopContext);
  if (!context) {
    throw new Error('useMultiShop must be used within a MultiShopProvider');
  }
  return context;
}