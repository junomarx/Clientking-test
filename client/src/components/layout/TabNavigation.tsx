import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { BarChart, FileText } from 'lucide-react';

type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex justify-between overflow-x-auto bg-white border-b border-gray-200">
      <div className="flex overflow-x-auto">
        <button 
          className={`px-4 py-4 font-semibold ${
            activeTab === 'dashboard' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
          } transition-all flex items-center`}
          onClick={() => onTabChange('dashboard')}
        >
          <span className="mr-2">📊</span> Dashboard
        </button>
        <button 
          className={`px-4 py-4 font-semibold ${
            activeTab === 'repairs' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
          } transition-all flex items-center`}
          onClick={() => onTabChange('repairs')}
        >
          <span className="mr-2">🔧</span> Reparaturen
        </button>
        <button 
          className={`px-4 py-4 font-semibold ${
            activeTab === 'customers' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
          } transition-all flex items-center`}
          onClick={() => onTabChange('customers')}
        >
          <span className="mr-2">👥</span> Kunden
        </button>
        <button 
          className={`px-4 py-4 font-semibold ${
            activeTab === 'statistics' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
          } transition-all flex items-center`}
          onClick={() => onTabChange('statistics')}
        >
          <BarChart className="mr-2 h-4 w-4" /> Statistiken
        </button>
        <button 
          className={`px-4 py-4 font-semibold ${
            activeTab === 'cost-estimates' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
          } transition-all flex items-center`}
          onClick={() => onTabChange('cost-estimates')}
        >
          <FileText className="mr-2 h-4 w-4" /> Kostenvoranschläge
        </button>
      </div>
    </div>
  );
}