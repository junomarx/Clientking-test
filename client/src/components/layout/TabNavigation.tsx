import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { BarChart, FileText, Menu, X } from 'lucide-react';

type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Funktion zum Ändern des Tabs (schließt auch das mobile Menü)
  const handleTabChange = (tab: Tab) => {
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
            className={`w-full py-3 px-4 text-left rounded-md ${activeTab === 'cost-estimates' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'}`}
            onClick={() => handleTabChange('cost-estimates')}
          >
            <FileText className="mr-2 inline h-4 w-4" /> Kostenvoranschläge
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
                : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
            } transition-all flex items-center`}
            onClick={() => handleTabChange('cost-estimates')}
          >
            <FileText className="mr-2 h-4 w-4" /> Kostenvoranschläge
          </button>
        </div>
      </div>
    </div>
  );
}