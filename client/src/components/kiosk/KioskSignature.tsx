import React, { useRef, useState, useEffect } from 'react';
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
import { useOnlineStatus } from '@/hooks/use-online-status';
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
  
  // 3-Schritte-Prozess - aber bei Status "fertig" direkt zur Unterschrift
  const getInitialStep = () => {
    // Bei Status "fertig" direkt zur Unterschrift springen
    if (signatureRequest?.status === "fertig") {
      return "signature";
    }
    return "terms";
  };
  
  const [currentStep, setCurrentStep] = useState<"terms" | "deviceCode" | "signature">(getInitialStep());
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string>("");
  const [deviceCodeType, setDeviceCodeType] = useState<"pin" | "pattern" | null>(null);
  const [showPatternDrawer, setShowPatternDrawer] = useState(false);

  // Effect um currentStep bei Änderung der signatureRequest zu aktualisieren
  useEffect(() => {
    if (signatureRequest) {
      setCurrentStep(getInitialStep());
    }
  }, [signatureRequest]);

  // Reparaturbedingungen sind jetzt direkt in der signatureRequest enthalten

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

  const { sendMessage } = useOnlineStatus();

  const submitSignatureMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      console.log('Kiosk: Sende Unterschrift für repairId:', signatureRequest?.repairId);
      
      // Zusätzlich WebSocket-Nachricht für sofortige PC-Benachrichtigung
      if (sendMessage && signatureRequest?.tempId) {
        sendMessage({
          type: 'signature-complete',
          tempId: signatureRequest.tempId,
          repairId: signatureRequest.repairId,
          signatureData,
          timestamp: Date.now()
        });
        console.log(`🎉 Signature-Complete gesendet für tempId: ${signatureRequest.tempId}`);
      }
      
      const response = await apiRequest('POST', '/api/kiosk-signature', {
        repairId: signatureRequest?.repairId,
        signature: signatureData,
        deviceCode: deviceCode || null,
        deviceCodeType: deviceCodeType || null,
        tempId: signatureRequest?.tempId,
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
      <div className="fixed inset-0 bg-gray-50 z-50 min-h-screen">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b-2 border-gray-200">
            <h1 className="text-4xl font-bold text-gray-700 mb-2 tracking-tight">
              Reparaturauftrag
            </h1>
            <p className="text-gray-500 text-lg">
              Auftragsbestätigung & Bedingungen
            </p>
            {signatureRequest?.shopName && (
              <p className="text-gray-600 text-base mt-1">
                {signatureRequest.shopName}
              </p>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Kundendaten Card */}
            <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
              <div className="flex items-center mb-5 pb-4 border-b border-gray-100">
                <svg className="w-6 h-6 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-700">Kundendaten</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Name</span>
                  <span className="text-base text-gray-900 font-medium">{signatureRequest.customerName}</span>
                </div>
                {signatureRequest.customerPhone && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Telefon</span>
                    <span className="text-base text-gray-900 font-medium">{signatureRequest.customerPhone}</span>
                  </div>
                )}
                {signatureRequest.customerEmail && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">E-Mail</span>
                    <span className="text-base text-gray-900 font-medium">{signatureRequest.customerEmail}</span>
                  </div>
                )}
                {signatureRequest.customerAddress && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Adresse</span>
                    <span className="text-base text-gray-900 font-medium">{signatureRequest.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reparaturdetails Card */}
            <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
              <div className="flex items-center mb-5 pb-4 border-b border-gray-100">
                <svg className="w-6 h-6 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-700">Reparaturdetails</h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {signatureRequest.deviceInfo && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Gerät</span>
                      <span className="text-base text-gray-900 font-medium">{signatureRequest.deviceInfo}</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Fehler</span>
                    <span className="text-base text-gray-900 font-medium">{signatureRequest.repairDetails}</span>
                  </div>
                  {signatureRequest.orderCode && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Auftragsnummer</span>
                      <span className="text-base text-gray-900 font-medium">{signatureRequest.orderCode}</span>
                    </div>
                  )}
                  {signatureRequest.estimatedCost && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Kosten</span>
                      <span className="text-base text-gray-900 font-medium">{signatureRequest.estimatedCost}€</span>
                    </div>
                  )}
                </div>
                {signatureRequest.status && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider block">Status</span>
                    <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm font-medium capitalize">
                      {signatureRequest.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reparaturbedingungen - Full Width */}
          <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm mb-8">
            <div className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <svg className="w-6 h-6 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-700">Reparaturbedingungen</h2>
            </div>
            <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              {signatureRequest?.repairTerms || 'Es wurden keine spezifischen Reparaturbedingungen hinterlegt.'}
            </div>
          </div>

          {/* Footer Section */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <div className="flex items-start p-5 mb-7 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="w-5 h-5 mr-4 mt-0.5 flex-shrink-0"
              />
              <Label htmlFor="terms" className="text-base text-gray-700 font-medium cursor-pointer">
                Ich habe die Reparaturbedingungen gelesen und stimme diesen zu.
              </Label>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-14 text-lg font-semibold border-2 hover:bg-gray-50"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleTermsComplete}
                disabled={!termsAccepted}
                className="flex-1 h-14 text-lg font-semibold disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
              >
                Weiter zur Gerätecode-Eingabe
              </Button>
            </div>
          </div>
        </div>
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
                    type="text"
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
                          <span className="text-green-800 font-medium">
                            Muster erfasst: {deviceCode.split('-').map(p => parseInt(p) + 1).join(' → ')}
                          </span>
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

        {/* Pattern Drawer Modal - nur in Schritt 2 */}
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
            {/* Zurück-Button nur anzeigen wenn nicht bei Status "fertig" (da dann direkt zur Unterschrift gesprungen wird) */}
            {signatureRequest?.status !== "fertig" && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep("deviceCode")}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
            
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


    </div>
  );
}