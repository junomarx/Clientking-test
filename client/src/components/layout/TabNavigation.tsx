import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, BarChart, FileText, Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PricingPlan } from '@/lib/types';

type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates' | 'settings';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  
  // Repair Quota API-Anfrage (enthält Preisplan-Informationen)
  const { data: quotaData } = useQuery({
    queryKey: ["/api/repair-quota"],
    queryFn: async () => {
      const response = await fetch("/api/repair-quota");
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Reparaturquote");
      }
      return response.json();
    },
    enabled: !!user
  });
  
  // API-Anfrage, um zu prüfen, ob der Benutzer Kostenvoranschläge verwenden darf
  const { data: costEstimatesPermission } = useQuery({
    queryKey: ["/api/can-use-cost-estimates"],
    queryFn: async () => {
      const response = await fetch("/api/can-use-cost-estimates");
      if (!response.ok) {
        // Wenn der Zugriff fehlschlägt, nehmen wir an, dass die Funktion nicht verfügbar ist
        return { canUseCostEstimates: false };
      }
      return response.json();
    },
    enabled: !!user
  });
  
  // Prüfen, ob der Benutzer einen Basic-Plan hat
  const isBasicPlan = quotaData?.pricingPlan === "basic";
  
  // Prüfen ob der Benutzer Professional oder höher hat
  // Wir verwenden sowohl die direkte Abfrage als auch die Daten aus dem Repair-Quota-Endpunkt
  const isProfessionalOrHigher = 
    (costEstimatesPermission?.canUseCostEstimates === true) || 
    (quotaData?.pricingPlan === "professional" || quotaData?.pricingPlan === "enterprise");
    
  // Kostenvoranschläge sind nur für Professional und höher verfügbar
  const canUseCostEstimates = isProfessionalOrHigher;
  
  // Funktion zum Ändern des Tabs (schließt auch das mobile Menü)
  const handleTabChange = (tab: Tab) => {
    // Wenn Kostenvoranschläge ausgewählt wurden und Benutzer keine Berechtigung hat, Warnung anzeigen
    if (tab === "cost-estimates" && !canUseCostEstimates) {
      alert("Kostenvoranschläge sind nur für Professional und Enterprise Abonnenten verfügbar.");
      return;
    }
    
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Mobile Menü Button - nur auf kleinen Bildschirmen sichtbar */}
      <div className="md:hidden flex justify-between items-center px-4 py-2">
        <div className="font-semibold text-primary">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-gray-100"
          aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown Menü */}
      {mobileMenuOpen && (
        <div className="md:hidden py-2 px-4 space-y-1 bg-white shadow-md">
          <button 
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <span className="mr-2">📊</span> Dashboard
          </button>
          <button 
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'repairs' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'}`}
            onClick={() => handleTabChange('repairs')}
          >
            <span className="mr-2">🔧</span> Reparaturen
          </button>
          <button 
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'customers' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'}`}
            onClick={() => handleTabChange('customers')}
          >
            <span className="mr-2">👥</span> Kunden
          </button>
          <button 
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'statistics' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'}`}
            onClick={() => handleTabChange('statistics')}
          >
            <BarChart className="mr-2 inline h-4 w-4" /> Statistiken
          </button>
          <button 
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'cost-estimates' ? 'bg-primary/10 text-primary font-medium' : !canUseCostEstimates ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600'}`}
            onClick={() => handleTabChange('cost-estimates')}
            disabled={!canUseCostEstimates}
          >
            <FileText className="mr-2 inline h-4 w-4" /> 
            {!canUseCostEstimates ? (
              <span className="flex items-center">
                Kostenvoranschläge
                <AlertCircle className="ml-1 h-3 w-3 text-amber-500" />
              </span>
            ) : (
              "Kostenvoranschläge"
            )}
          </button>
          <button 
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'settings' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'}`}
            onClick={() => handleTabChange('settings')}
          >
            <span className="mr-2">⚙️</span> Einstellungen
          </button>
        </div>
      )}

      {/* Desktop Navigation - nur auf mittelgroßen und größeren Bildschirmen sichtbar */}
      <div className="hidden md:flex justify-between overflow-x-auto">
        <div className="flex overflow-x-auto">
          <button 
            className={`px-4 py-4 font-semibold ${
              activeTab === 'dashboard' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('dashboard')}
          >
            <span className="mr-2">📊</span> Dashboard
          </button>
          <button 
            className={`px-4 py-4 font-semibold ${
              activeTab === 'repairs' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('repairs')}
          >
            <span className="mr-2">🔧</span> Reparaturen
          </button>
          <button 
            className={`px-4 py-4 font-semibold ${
              activeTab === 'customers' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('customers')}
          >
            <span className="mr-2">👥</span> Kunden
          </button>
          <button 
            className={`px-4 py-4 font-semibold ${
              activeTab === 'statistics' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('statistics')}
          >
            <BarChart className="mr-2 h-4 w-4" /> Statistiken
          </button>
          <button 
            className={`px-4 py-4 font-semibold ${
              activeTab === 'cost-estimates' 
                ? 'text-primary border-b-2 border-primary' 
                : !canUseCostEstimates
                  ? 'text-gray-400 hover:text-gray-400 border-b-2 border-transparent cursor-not-allowed' 
                  : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('cost-estimates')}
            disabled={!canUseCostEstimates}
          >
            <FileText className="mr-2 h-4 w-4" />
            {!canUseCostEstimates ? (
              <span className="flex items-center">
                Kostenvoranschläge
                <AlertCircle className="ml-1 h-3 w-3 text-amber-500" />
              </span>
            ) : (
              "Kostenvoranschläge"
            )}
          </button>
          <button 
            className={`px-4 py-4 font-semibold ${
              activeTab === 'settings' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('settings')}
          >
            <span className="mr-2">⚙️</span> Einstellungen
          </button>
        </div>
      </div>
    </div>
  );
}