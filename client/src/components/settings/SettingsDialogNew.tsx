import React, { useState } from "react";
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
  UserCog
} from "lucide-react";
import { EmailTemplateTab } from "@/components/settings/EmailTemplateTab";
import { SmsTemplateTab } from "@/components/settings/SmsTemplateTab";
import { BusinessSettingsDialogNew } from "@/components/settings/BusinessSettingsDialogNew";

interface SettingsDialogNewProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialogNew({ open, onClose }: SettingsDialogNewProps) {
  const [activeTab, setActiveTab] = useState("business");
  const [activeEmailTab, setActiveEmailTab] = useState("templates");
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);
  
  // Geschäftseinstellungen öffnen
  const openBusinessSettings = () => {
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
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Unternehmen
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Kommunikation
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Darstellung
              </TabsTrigger>
              <TabsTrigger value="user" className="flex items-center gap-2">
                <UserCog className="h-4 w-4" /> Benutzer
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

            {/* Tab: Kommunikation */}
            <TabsContent value="communication" className="max-h-[65vh] overflow-y-auto">
              <Tabs defaultValue="templates" value={activeEmailTab} onValueChange={setActiveEmailTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="templates">E-Mail-Vorlagen</TabsTrigger>
                  <TabsTrigger value="sms">SMS-Vorlagen</TabsTrigger>
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
                <Button onClick={openBusinessSettings} className="w-full sm:w-auto">
                  Design-Einstellungen bearbeiten
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Benutzer */}
            <TabsContent value="user" className="max-h-[65vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Benutzereinstellungen</h3>
                  <p className="text-muted-foreground mb-4">
                    Verwalten Sie Ihr Benutzerkonto, Passwort und Sicherheitseinstellungen.
                  </p>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Passwort ändern
                  </Button>
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
      />
    </>
  );
}