import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKioskMode } from "@/hooks/use-kiosk-mode";
import { KioskCustomerForm } from "@/components/kiosk/KioskCustomerForm";
import { KioskSignature } from "@/components/kiosk/KioskSignature";
import { Tablet, Shield, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import clientKingLogo from "@/assets/clientking-logo.png";

export function KioskOverlay() {
  const { isKioskMode, deactivateKioskMode, signatureRequest, clearSignatureRequest } = useKioskMode();
  const { user } = useAuth();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [currentView, setCurrentView] = useState<'home' | 'customer-form' | 'signature'>('home');
  
  // Geschäftseinstellungen für Logo abrufen (Kiosk-spezifischer Endpunkt)
  const { data: businessSettings, isLoading, error } = useQuery({
    queryKey: ['/api/kiosk/business-settings', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/kiosk/business-settings?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch business settings');
      return response.json();
    },
    enabled: isKioskMode && !!user?.id, // Nur laden wenn Kiosk-Modus aktiv ist und User-ID verfügbar
  });



  if (!isKioskMode) return null;

  const handleExitAttempt = async () => {
    if (pin.trim() === "") return;
    
    // Master-PIN für Emergency-Logout (funktioniert immer, auch bei Session-Timeout)
    const MASTER_PIN = "678910";
    
    if (pin === MASTER_PIN) {
      // Sofortiger Logout ohne API-Call
      deactivateKioskMode();
      setShowExitDialog(false);
      setPin("");
      
      // Zusätzlich User ausloggen falls Session noch aktiv
      try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload(); // Seite neu laden für sauberen Zustand
      } catch (error) {
        // Ignorieren - Master-PIN soll immer funktionieren
        window.location.reload();
      }
      return;
    }
    
    try {
      // Normale PIN validation via API
      const response = await fetch('/api/validate-kiosk-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (response.ok) {
        deactivateKioskMode();
        setShowExitDialog(false);
        setPin("");
      } else {
        alert("Falscher PIN. Zugang verweigert.");
        setPin("");
      }
    } catch (error) {
      alert("Fehler bei der PIN-Validierung. Versuchen Sie den Master-PIN 678910.");
      setPin("");
    }
  };

  // Automatisches Öffnen der Unterschrift bei eingehender Anfrage
  if (signatureRequest && currentView !== 'signature') {
    setCurrentView('signature');
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'customer-form':
        return (
          <KioskCustomerForm 
            onSuccess={() => setCurrentView('home')}
            onCancel={() => setCurrentView('home')}
          />
        );
      case 'signature':
        return (
          <KioskSignature 
            onSuccess={() => {
              clearSignatureRequest();
              setCurrentView('home');
            }}
            onCancel={() => {
              clearSignatureRequest();
              setCurrentView('home');
            }}
          />
        );
      default:
        return (
          <div className="min-h-screen bg-white flex items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-8">
              {/* Header */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {user?.username === "bugi" ? (
                    businessSettings?.logoUrl ? (
                      <img 
                        src={businessSettings.logoUrl} 
                        alt={businessSettings.businessName || "Firmenlogo"}
                        className="h-16 w-auto max-w-xs object-contain"
                      />
                    ) : (
                      <Tablet className="h-16 w-16 text-blue-600" />
                    )
                  ) : (
                    <img 
                      src={clientKingLogo} 
                      alt="ClientKing Handyshop Verwaltung"
                      className="h-32 w-auto max-w-md object-contain"
                    />
                  )}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Kundendatenerfassung
                </h1>
                <p className="text-xl text-gray-600">
                  Willkommen! Geben Sie Ihre persönlichen Daten ein.
                </p>
              </div>

              {/* Action Cards */}
              <div className="space-y-6">
                {/* Kundendaten erfassen - Hauptfunktion */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
                      onClick={() => setCurrentView('customer-form')}>
                  <CardHeader className="text-center pb-6">
                    <div className="flex justify-center mb-4">
                      <User className="h-16 w-16 text-blue-600" />
                    </div>
                    <CardTitle className="text-3xl mb-2">Kundendaten erfassen</CardTitle>
                    <CardDescription className="text-lg text-gray-600">
                      Geben Sie Ihre persönlichen Daten für die Reparaturannahme ein
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700" size="lg">
                      Daten eingeben
                    </Button>
                  </CardContent>
                </Card>

                {/* Unterschrift - nur wenn angefordert */}
                {signatureRequest && (
                  <Card className="border-orange-300 bg-orange-50 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setCurrentView('signature')}>
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-4">
                        <Shield className="h-12 w-12 text-orange-600" />
                      </div>
                      <CardTitle className="text-2xl text-orange-700">
                        Unterschrift erforderlich
                      </CardTitle>
                      <CardDescription className="text-lg text-orange-600">
                        Bitte unterschreiben Sie für Ihre Reparatur
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full h-16 text-xl bg-orange-600 hover:bg-orange-700" size="lg">
                        Jetzt unterschreiben
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Zur Unterschrift Button - immer sichtbar für Refresh */}
                <Card className="border-green-300 bg-green-50 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => window.location.reload()}>
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <Shield className="h-12 w-12 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-700">
                      Zur Unterschrift
                    </CardTitle>
                    <CardDescription className="text-lg text-green-600">
                      Seite aktualisieren um Unterschriften-Anfragen zu laden
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full h-16 text-xl bg-green-600 hover:bg-green-700" size="lg">
                      Seite aktualisieren
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Exit Button - Small and discrete */}
              <div className="text-center pt-8">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowExitDialog(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Admin-Zugang
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Fullscreen Overlay */}
      <div className="fixed inset-0 z-50 bg-white overflow-hidden">
        {renderCurrentView()}
      </div>

      {/* Exit PIN Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kiosk-Modus verlassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exit-pin">Admin-PIN eingeben</Label>
              <Input
                id="exit-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExitAttempt()}
                placeholder="PIN eingeben"
                className="text-center text-lg"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleExitAttempt} 
                disabled={!pin.trim()}
                className="flex-1"
              >
                Bestätigen
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowExitDialog(false);
                  setPin("");
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}