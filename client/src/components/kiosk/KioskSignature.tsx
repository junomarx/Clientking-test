import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenTool, RotateCcw, Check, X, Shield, User, Smartphone, ArrowRight, ArrowLeft } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useKioskMode } from '@/hooks/use-kiosk-mode';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PatternDrawer } from './PatternDrawer';

interface KioskSignatureProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function KioskSignature({ onCancel, onSuccess }: KioskSignatureProps) {
  const { toast } = useToast();
  const { signatureRequest, clearSignatureRequest } = useKioskMode();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 3-Schritte-Prozess
  const [currentStep, setCurrentStep] = useState<"terms" | "deviceCode" | "signature">("terms");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string>("");
  const [deviceCodeType, setDeviceCodeType] = useState<"pin" | "pattern" | null>(null);
  const [showPatternDrawer, setShowPatternDrawer] = useState(false);

  // Geschäftseinstellungen für Reparaturbedingungen laden
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    enabled: !!signatureRequest
  });

  // Schritt-Handler
  const handleTermsComplete = () => {
    if (termsAccepted) {
      setCurrentStep("deviceCode");
    }
  };

  const handleDeviceCodeComplete = (code?: string, type?: string) => {
    if (code) {
      setDeviceCode(code);
      setDeviceCodeType(type as "pin" | "pattern");
    }
    setCurrentStep("signature");
  };

  const submitSignatureMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      console.log('Kiosk: Sende Unterschrift für repairId:', signatureRequest?.repairId);
      const response = await apiRequest('POST', '/api/kiosk-signature', {
        repairId: signatureRequest?.repairId,
        signature: signatureData,
        deviceCode: deviceCode || null,
        deviceCodeType: deviceCodeType || null,
        timestamp: Date.now()
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Unterschrift übertragen',
        description: 'Ihre Unterschrift wurde erfolgreich gespeichert.',
      });
      clearSignatureRequest();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: 'Beim Übertragen der Unterschrift ist ein Fehler aufgetreten.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!sigCanvas.current || !signatureRequest) return;
    
    const canvas = sigCanvas.current.getCanvas();
    if (sigCanvas.current.isEmpty()) {
      toast({
        title: 'Unterschrift erforderlich',
        description: 'Bitte setzen Sie Ihre Unterschrift.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const signatureData = canvas.toDataURL();
    submitSignatureMutation.mutate(signatureData);
  };

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleCancel = () => {
    clearSignatureRequest();
    onCancel();
  };

  if (!signatureRequest) {
    return null;
  }

  // Schritt 1: Reparaturbedingungen und Kundendaten
  if (currentStep === "terms") {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-blue-600" />
              Reparaturauftrag und Geschäftsbedingungen
            </CardTitle>
            <p className="text-center text-gray-600 text-sm">
              {businessSettings?.businessName}
            </p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col space-y-6 overflow-y-auto">
            {/* Kundendaten */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Kundendaten
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="font-medium text-lg">
                  {signatureRequest.customerName}
                </div>
                {signatureRequest.customerPhone && (
                  <div className="text-sm text-gray-600">
                    📞 {signatureRequest.customerPhone}
                  </div>
                )}
                {signatureRequest.customerEmail && (
                  <div className="text-sm text-gray-600">
                    ✉️ {signatureRequest.customerEmail}
                  </div>
                )}
                {signatureRequest.customerAddress && (
                  <div className="text-sm text-gray-600">
                    📍 {signatureRequest.customerAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Reparaturdaten */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Reparaturdetails
              </h3>
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <div className="font-medium text-blue-900">
                  {signatureRequest.repairDetails}
                </div>
                {signatureRequest.deviceInfo && (
                  <div className="text-sm text-blue-700">
                    📱 {signatureRequest.deviceInfo}
                  </div>
                )}
                {signatureRequest.orderCode && (
                  <div className="text-sm text-blue-700">
                    🏷️ Auftragsnummer: {signatureRequest.orderCode}
                  </div>
                )}
                {signatureRequest.estimatedCost && (
                  <div className="text-sm text-blue-700">
                    💰 Geschätzte Kosten: {signatureRequest.estimatedCost}€
                  </div>
                )}
                {signatureRequest.status && (
                  <div className="text-sm text-blue-700">
                    📊 Status: {signatureRequest.status}
                  </div>
                )}
              </div>
            </div>

            {/* Reparaturbedingungen */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Reparaturbedingungen</h3>
              <div className="p-4 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                <div className="text-sm whitespace-pre-wrap">
                  {businessSettings?.repairTerms || 'Es wurden keine spezifischen Reparaturbedingungen hinterlegt.'}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm">
                  Ich habe die Reparaturbedingungen gelesen und stimme diesen zu.
                </Label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              
              <Button
                onClick={handleTermsComplete}
                disabled={!termsAccepted}
                className="flex-1"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Weiter zur Gerätecode-Eingabe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Schritt 2: Gerätecode-Eingabe
  if (currentStep === "deviceCode") {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Smartphone className="h-6 w-6 text-blue-600" />
              Gerätecode eingeben
            </CardTitle>
            <p className="text-gray-600">
              Falls Ihr Gerät einen Sperrcode hat, können Sie diesen hier eingeben
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="codeType" className="text-base font-medium">Art des Codes</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Button
                    variant={deviceCodeType === "pin" ? "default" : "outline"}
                    onClick={() => setDeviceCodeType("pin")}
                    className="h-12 text-base"
                  >
                    PIN-Code
                  </Button>
                  <Button
                    variant={deviceCodeType === "pattern" ? "default" : "outline"}
                    onClick={() => setDeviceCodeType("pattern")}
                    className="h-12 text-base"
                  >
                    Entsperrmuster
                  </Button>
                </div>
              </div>

              {deviceCodeType === "pin" && (
                <div>
                  <Label htmlFor="deviceCode" className="text-base font-medium">PIN-Code eingeben</Label>
                  <Input
                    id="deviceCode"
                    type="password"
                    value={deviceCode}
                    onChange={(e) => setDeviceCode(e.target.value)}
                    placeholder="z.B. 1234 oder 0000"
                    className="mt-2 h-12 text-center text-lg"
                    maxLength={8}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Geben Sie den 4-8 stelligen PIN-Code ein
                  </p>
                </div>
              )}

              {deviceCodeType === "pattern" && (
                <div>
                  <Label htmlFor="deviceCode" className="text-base font-medium">Entsperrmuster</Label>
                  <div className="mt-3 space-y-4">
                    {deviceCode ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-green-800 font-medium">Muster erfasst: {deviceCode}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeviceCode("");
                            setShowPatternDrawer(true);
                          }}
                          className="mt-2"
                        >
                          Muster ändern
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowPatternDrawer(true)}
                        className="w-full h-16 flex flex-col gap-2"
                      >
                        <Smartphone className="h-6 w-6" />
                        <span>Muster zeichnen</span>
                      </Button>
                    )}
                    
                    <div className="text-sm text-gray-500">
                      <p>Zeichnen Sie das Android-Entsperrmuster durch Verbinden der Punkte</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("terms")}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleDeviceCodeComplete()}
                className="flex-1"
              >
                Überspringen
              </Button>
              
              <Button
                onClick={() => handleDeviceCodeComplete(deviceCode, deviceCodeType || undefined)}
                disabled={!deviceCodeType}
                className="flex-1"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Weiter zur Unterschrift
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Schritt 3: Unterschrift
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        <CardHeader className="text-center pb-6">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <PenTool className="h-6 w-6 text-blue-600" />
            Unterschrift erforderlich
          </CardTitle>
          <p className="text-gray-600">
            Bitte unterschreiben Sie für: {signatureRequest.customerName}
          </p>
          <p className="text-sm text-gray-500">
            {signatureRequest.repairDetails}
          </p>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg mb-4 relative">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-full rounded-lg',
                style: { backgroundColor: 'white' }
              }}
            />
            <div className="absolute top-2 left-2 text-gray-400 text-sm pointer-events-none">
              Bitte hier unterschreiben
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("deviceCode")}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Löschen
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Übertrage...' : 'Unterschrift übertragen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Drawer Modal */}
      {showPatternDrawer && (
        <PatternDrawer
          onPatternComplete={(pattern) => {
            setDeviceCode(pattern);
            setShowPatternDrawer(false);
          }}
          onClose={() => setShowPatternDrawer(false)}
        />
      )}
    </div>
  );
}