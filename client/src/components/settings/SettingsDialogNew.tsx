import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { 
  Building2, 
  Mail, 
  Settings, 
  MessageSquare,
  UserCog,
  LogOut,
  Lock,
  Package
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { EmailTemplateTab } from "@/components/settings/EmailTemplateTab";
import { SmsTemplateTab } from "@/components/settings/SmsTemplateTab";
// ModelManagementTab nicht mehr verwendet
import { BusinessSettingsDialogNew } from "@/components/settings/BusinessSettingsDialogNew";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";

interface SettingsDialogNewProps {
  open: boolean;
  onClose: () => void;
}

// Typ-Definition für die API-Antwort des Reparaturkontingents
interface RepairQuota {
  canCreate: boolean;
  currentCount: number;
  limit: number;
  pricingPlan: string;
  displayName: string;
  currentMonth: string;
  currentYear: number;
}

// Komponente zur Anzeige des Preispakets und Reparaturkontingents
function PricingPlanDisplay() {
  // Abrufen des Reparaturkontingents über die API
  const { data: quotaData, isLoading, error } = useQuery<RepairQuota>({
    queryKey: ["/api/repair-quota"],
    // Alle 30 Sekunden aktualisieren, wenn der Dialog geöffnet ist
    refetchInterval: 30000,
  });
  
  // Farbkodierung je nach Paket
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "basic": return "text-gray-500";
      case "professional": return "text-green-500";
      case "enterprise": return "text-blue-500";
      default: return "text-gray-500";
    }
  };
  
  // Prozentsatz der verbrauchten Kontingent berechnen
  const usagePercentage = quotaData 
    ? Math.min(100, Math.round((quotaData.currentCount / quotaData.limit) * 100)) 
    : 0;
  
  if (isLoading) {
    return (
      <div className="border rounded-md p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (error || !quotaData) {
    return (
      <div className="border rounded-md p-4 text-red-500">
        Kontingentinformationen konnten nicht geladen werden.
      </div>
    );
  }
  
  // Bei Professional und Enterprise kein Limit anzeigen
  if (quotaData.pricingPlan !== "basic") {
    return (
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h4 className="font-medium">Preispaket</h4>
          </div>
          <span className={`font-medium ${getPlanColor(quotaData.pricingPlan)}`}>
            {quotaData.displayName}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Unbegrenzte Reparaturaufträge pro Monat
        </div>
      </div>
    );
  }
  
  // Für Basic-Paket mit Limitierung
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h4 className="font-medium">Preispaket</h4>
        </div>
        <span className={`font-medium ${getPlanColor(quotaData.pricingPlan)}`}>
          {quotaData.displayName}
        </span>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Verbleibende Reparaturaufträge</span>
          <span>
            {quotaData.limit - quotaData.currentCount} von {quotaData.limit}
          </span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
      </div>
      
      <div className="text-xs text-muted-foreground">
        {quotaData.currentMonth} {quotaData.currentYear}
        {quotaData.currentCount >= quotaData.limit && (
          <div className="mt-1 text-red-500 font-medium">
            Monatliches Limit erreicht. Upgrade auf Professional für unbegrenzte Aufträge.
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsDialogNew({ open, onClose }: SettingsDialogNewProps) {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("business");
  const [activeEmailTab, setActiveEmailTab] = useState("templates");
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  
  // Abmelden-Funktion
  const handleLogout = () => {
    logoutMutation.mutate();
    onClose(); // Dialog schließen
  };
  
  // Standardwert für den Tab beim Öffnen der Geschäftseinstellungen
  const [initialTab, setInitialTab] = useState<"unternehmen" | "email" | "design">("unternehmen");
  
  // Geschäftseinstellungen öffnen
  const openBusinessSettings = () => {
    setInitialTab("unternehmen"); // Default-Tab
    setShowBusinessSettings(true);
  };
  
  // Geschäftseinstellungen schließen
  const closeBusinessSettings = () => {
    setShowBusinessSettings(false);
  };
  
  return (
    <>
      {/* Hauptdialog für Einstellungen */}
      <Dialog open={open && !showBusinessSettings} onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>
              Passen Sie Ihre Unternehmenseinstellungen und Kommunikationsoptionen an.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="business" className="flex items-center justify-center text-xs sm:text-sm">
                <Building2 className="h-4 w-4 mr-1 sm:mr-2" /> <span>Firma</span>
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center justify-center text-xs sm:text-sm">
                <Mail className="h-4 w-4 mr-1 sm:mr-2" /> <span>Komm.</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center justify-center text-xs sm:text-sm">
                <Settings className="h-4 w-4 mr-1 sm:mr-2" /> <span>Design</span>
              </TabsTrigger>
              <TabsTrigger value="user" className="flex items-center justify-center text-xs sm:text-sm">
                <UserCog className="h-4 w-4 mr-1 sm:mr-2" /> <span>User</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Unternehmenseinstellungen */}
            <TabsContent value="business" className="max-h-[65vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Geschäftseinstellungen</h3>
                  <p className="text-muted-foreground mb-4">
                    Verwalten Sie Ihre Unternehmensdetails, die auf Rechnungen und im Kundenkontakt verwendet werden.
                  </p>
                  <Button onClick={openBusinessSettings} className="w-full sm:w-auto">
                    Geschäftseinstellungen bearbeiten
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Modellverwaltung wurde entfernt */}
            
            {/* Tab: Kommunikation */}
            <TabsContent value="communication" className="max-h-[65vh] overflow-y-auto">
              <Tabs defaultValue="templates" value={activeEmailTab} onValueChange={setActiveEmailTab}>
                <TabsList className="mb-4 grid grid-cols-2 gap-1">
                  <TabsTrigger value="templates" className="flex items-center justify-center text-xs sm:text-sm">
                    <Mail className="h-4 w-4 mr-1 sm:mr-2" /> <span>E-Mail</span>
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="flex items-center justify-center text-xs sm:text-sm">
                    <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" /> <span>SMS</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* E-Mail-Vorlagen */}
                <TabsContent value="templates">
                  <EmailTemplateTab />
                </TabsContent>
                
                {/* SMS-Vorlagen */}
                <TabsContent value="sms">
                  <SmsTemplateTab />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Tab: Darstellung */}
            <TabsContent value="appearance" className="max-h-[65vh] overflow-y-auto">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-2">Design-Einstellungen</h3>
                <p className="text-muted-foreground mb-4">
                  Passen Sie das Erscheinungsbild der Anwendung und Ihre Druckereinstellungen an.
                </p>
                <Button 
                  onClick={() => {
                    // Öffnet die Geschäftseinstellungen und setzt direkt den Design-Tab
                    setInitialTab("design");
                    setShowBusinessSettings(true);
                  }} 
                  className="w-full sm:w-auto"
                >
                  Design-Einstellungen bearbeiten
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Benutzer */}
            <TabsContent value="user" className="max-h-[65vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Preispaket & Kontingent */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Preispaket & Kontingent</h3>
                  <p className="text-muted-foreground mb-4">
                    Ihr aktuelles Preispaket und verbleibende Reparaturaufträge in diesem Monat.
                  </p>
                  <PricingPlanDisplay />
                </div>
                
                {/* Benutzereinstellungen */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Benutzereinstellungen</h3>
                  <p className="text-muted-foreground mb-4">
                    Verwalten Sie Ihr Benutzerkonto, Passwort und Sicherheitseinstellungen.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Angemeldeter Benutzer</h4>
                      <div className="border rounded-md p-3 bg-muted/20">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCog className="h-4 w-4 text-primary" /> 
                          {user?.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2">Aktionen</h4>
                      <div className="flex flex-col space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => setIsChangePasswordDialogOpen(true)}
                        >
                          <Lock className="h-4 w-4 mr-2" /> Passwort ändern
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4 mr-2" /> Abmelden
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Der neue BusinessSettingsDialog */}
      <BusinessSettingsDialogNew 
        open={showBusinessSettings} 
        onClose={closeBusinessSettings}
        initialActiveTab={initialTab}
      />
      
      {/* Passwort-Ändern-Dialog */}
      <ChangePasswordDialog
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
    </>
  );
}