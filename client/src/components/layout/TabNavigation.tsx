import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Shield, BarChart } from 'lucide-react';

type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Admin-Bereich-Knopf nur anzeigen wenn User Admin-Rechte hat
  const showAdminButton = user && user.isAdmin;

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

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
      </div>
      
      {showAdminButton && (
        <div className="flex items-center">
          <button 
            className="px-4 py-2 mr-4 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center"
            onClick={handleGoToAdmin}
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </button>
        </div>
      )}
    </div>
  );
}