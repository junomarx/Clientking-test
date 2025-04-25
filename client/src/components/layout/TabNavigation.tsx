import React from 'react';

type Tab = 'dashboard' | 'repairs' | 'customers' | 'emailTemplates';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex overflow-x-auto bg-white border-b border-gray-200">
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
          activeTab === 'emailTemplates' 
            ? 'text-primary border-b-2 border-primary' 
            : 'text-gray-500 hover:text-primary border-b-2 border-transparent'
        } transition-all flex items-center`}
        onClick={() => onTabChange('emailTemplates')}
      >
        <span className="mr-2">✉️</span> E-Mail-Vorlagen
      </button>
    </div>
  );
}
