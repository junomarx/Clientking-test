import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUpRight,
  Users,
  Package,
  BarChart3,
  Store,
  Settings,
  UserCog,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Komponenten für die verschiedenen Tabs
import SuperadminDashboardTab from "@/components/superadmin/SuperadminDashboardTab";
import SuperadminUsersTab from "@/components/superadmin/SuperadminUsersTab";
import SuperadminPackagesTab from "@/components/superadmin/SuperadminPackagesTab";

export default function SuperadminPage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const { toast } = useToast();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Linke Seitenleiste */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-border bg-card px-5 py-5 overflow-y-auto">
          <div className="flex items-center mb-8">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold">Superadmin</h1>
          </div>
          
          <nav className="flex-1 space-y-1">
            <SideNavItem 
              icon={<LayoutDashboard className="h-5 w-5" />} 
              isActive={activeTab === "dashboard"} 
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </SideNavItem>
            
            <SideNavItem 
              icon={<Users className="h-5 w-5" />} 
              isActive={activeTab === "users"} 
              onClick={() => setActiveTab("users")}
            >
              Benutzer
            </SideNavItem>
            
            <SideNavItem 
              icon={<Package className="h-5 w-5" />} 
              isActive={activeTab === "packages"} 
              onClick={() => setActiveTab("packages")}
            >
              Pakete
            </SideNavItem>
          </nav>
        </div>
      </aside>

      {/* Hauptinhalt */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="md:hidden">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="users">Benutzer</TabsTrigger>
                <TabsTrigger value="packages">Pakete</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="dashboard" className="mt-0">
              <SuperadminDashboardTab />
            </TabsContent>
            
            <TabsContent value="users" className="mt-0">
              <SuperadminUsersTab />
            </TabsContent>
            
            <TabsContent value="packages" className="mt-0">
              <SuperadminPackagesTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// Hilfsfunktion für Seitennavigations-Items
function SideNavItem({ 
  children, 
  icon, 
  isActive, 
  onClick 
}: { 
  children: React.ReactNode; 
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center px-3 py-2 w-full rounded-md text-sm font-medium transition-colors
        ${isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'}
      `}
    >
      <span className="mr-3">{icon}</span>
      {children}
    </button>
  );
}
