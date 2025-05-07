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
    <div className="bg-background border-b">
      {/* Desktop Navigation als Tabs im Superadmin-Stil */}
      <div className="w-full overflow-x-auto hide-scrollbar">
        <div className="border-b px-1 md:px-6">
          <div className="flex space-x-1">
            <button 
              className={`px-3 py-3 text-sm font-medium transition-all rounded-t-md ${
                activeTab === 'dashboard' 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
              }`}
              onClick={() => handleTabChange('dashboard')}
            >
              <span className="mr-2">📊</span> Dashboard
            </button>
            <button 
              className={`px-3 py-3 text-sm font-medium transition-all rounded-t-md ${
                activeTab === 'repairs' 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
              }`}
              onClick={() => handleTabChange('repairs')}
            >
              <span className="mr-2">🔧</span> Reparaturen
            </button>
            <button 
              className={`px-3 py-3 text-sm font-medium transition-all rounded-t-md ${
                activeTab === 'customers' 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
              }`}
              onClick={() => handleTabChange('customers')}
            >
              <span className="mr-2">👥</span> Kunden
            </button>
            <button 
              className={`px-3 py-3 text-sm font-medium transition-all rounded-t-md ${
                activeTab === 'statistics' 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
              }`}
              onClick={() => handleTabChange('statistics')}
            >
              <BarChart className="mr-2 inline h-4 w-4" /> Statistiken
            </button>
            <button 
              className={`px-3 py-3 text-sm font-medium transition-all rounded-t-md ${
                activeTab === 'cost-estimates' 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : !canUseCostEstimates
                    ? 'text-muted-foreground/50 cursor-not-allowed' 
                    : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
              }`}
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
              className={`px-3 py-3 text-sm font-medium transition-all rounded-t-md ${
                activeTab === 'settings' 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
              }`}
              onClick={() => handleTabChange('settings')}
            >
              <span className="mr-2">⚙️</span> Einstellungen
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown-Button bleibt für schmale Bildschirme, aber mit angepasstem Styling */}
      <div className="md:hidden flex justify-between items-center px-4 py-2">
        <div className="font-semibold text-primary">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-muted"
          aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown-Menü mit angepasstem Styling */}
      {mobileMenuOpen && (
        <div className="md:hidden py-2 px-4 space-y-1 shadow-sm border-t">
          <button 
            className={`w-full py-2 px-3 text-left rounded-md text-sm ${
              activeTab === 'dashboard' 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('dashboard')}
          >
            <span className="mr-2">📊</span> Dashboard
          </button>
          <button 
            className={`w-full py-2 px-3 text-left rounded-md text-sm ${
              activeTab === 'repairs' 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('repairs')}
          >
            <span className="mr-2">🔧</span> Reparaturen
          </button>
          <button 
            className={`w-full py-2 px-3 text-left rounded-md text-sm ${
              activeTab === 'customers' 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('customers')}
          >
            <span className="mr-2">👥</span> Kunden
          </button>
          <button 
            className={`w-full py-2 px-3 text-left rounded-md text-sm ${
              activeTab === 'statistics' 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('statistics')}
          >
            <BarChart className="mr-2 inline h-4 w-4" /> Statistiken
          </button>
          <button 
            className={`w-full py-2 px-3 text-left rounded-md text-sm ${
              activeTab === 'cost-estimates' 
                ? 'bg-primary/10 text-primary font-medium' 
                : !canUseCostEstimates 
                  ? 'text-muted-foreground/50 cursor-not-allowed' 
                  : 'text-muted-foreground'
            }`}
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
            className={`w-full py-2 px-3 text-left rounded-md text-sm ${
              activeTab === 'settings' 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('settings')}
          >
            <span className="mr-2">⚙️</span> Einstellungen
          </button>
        </div>
      )}
    </div>
  );
}