import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PenTool, RotateCcw, XCircle, CheckCircle2 } from "lucide-react";
import DeviceCodeStep from "@/components/signature/DeviceCodeStep";

interface SignatureData {
  tempId: string;
  repairData: {
    customerName: string;
    device: string;
    issue: string;
    shopName: string;
    estimatedCost?: string;
    depositAmount?: string;
    customerData?: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      address?: string;
      zipCode?: string;
      city?: string;
    };
  };
  status: string;
  expiresAt: string;
}

export default function SignaturePage() {
  const { tempId } = useParams<{ tempId: string }>();
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showLandscapePrompt, setShowLandscapePrompt] = useState(false);
  const [signatureDataURL, setSignatureDataURL] = useState<string | null>(null);

  // 3-Schritt Prozess: Terms -> Device Code -> Signature
  const [currentStep, setCurrentStep] = useState<"terms" | "deviceCode" | "signature">("terms");
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [deviceCodeType, setDeviceCodeType] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (tempId) {
      fetchSignatureData();
    }
  }, [tempId]);

  // Orientierungserkennung - aber nicht automatisch wechseln
  useEffect(() => {
    const checkOrientation = () => {
      const actualLandscape = window.innerWidth > window.innerHeight;
      // Nur Prompt schließen wenn wirklich ins Querformat gedreht
      if (actualLandscape && showLandscapePrompt) {
        setShowLandscapePrompt(false);
        setIsLandscape(true); // Jetzt erst aktivieren
      }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [showLandscapePrompt]);

  // Unterschrift laden wenn Canvas bereit ist
  useEffect(() => {
    if (signatureRef.current && signatureDataURL) {
      // Kurze Verzögerung damit Canvas vollständig geladen ist
      setTimeout(() => {
        loadSignatureToCanvas();
      }, 100);
    }
  }, [isLandscape, signatureDataURL]);

  const fetchSignatureData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/signature/customer/${tempId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Laden der Unterschriftsdaten");
      }

      setSignatureData(data);

      // Prüfen ob bereits unterschrieben oder abgelaufen
      if (data.status === 'signed' || data.status === 'completed') {
        setError("Diese Unterschrift wurde bereits geleistet.");
      } else if (new Date() > new Date(data.expiresAt)) {
        setError("Dieser Unterschriftlink ist abgelaufen.");
      }

    } catch (err) {
      console.error("Fehler beim Laden der Unterschriftsdaten:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureBegin = () => {
    setSignatureEmpty(false);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const isEmpty = signatureRef.current.isEmpty();
      setSignatureEmpty(isEmpty);
      
      // Unterschrift speichern für Moduswechsel
      if (!isEmpty) {
        const dataURL = signatureRef.current.toDataURL();
        setSignatureDataURL(dataURL);
      }
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureEmpty(true);
      setSignatureDataURL(null);
    }
  };

  // Unterschrift laden wenn Canvas gewechselt wird
  const loadSignatureToCanvas = () => {
    if (signatureRef.current && signatureDataURL) {
      signatureRef.current.fromDataURL(signatureDataURL);
      setSignatureEmpty(false);
    }
  };

  // Handler für Terms Schritt
  const handleTermsComplete = () => {
    setCurrentStep("deviceCode");
  };

  // Handler für Device Code Schritt
  const handleDeviceCodeComplete = (code: string | null, type: string | null) => {
    setDeviceCode(code);
    setDeviceCodeType(type);
    setCurrentStep("signature");
    
    // Querformat-Prompt nach kurzer Verzögerung anzeigen
    setTimeout(() => {
      setShowLandscapePrompt(true);
    }, 500);
  };

  const submitSignature = async () => {
    if (signatureEmpty) return;

    try {
      setSubmitting(true);
      setError(null);

      // Aktuelle Unterschrift von Canvas holen oder gespeicherte verwenden
      let currentSignatureDataURL = signatureDataURL;
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        currentSignatureDataURL = signatureRef.current.toDataURL();
      }

      if (!currentSignatureDataURL) {
        setError("Keine Unterschrift vorhanden");
        return;
      }
      
      const response = await fetch(`/api/signature/customer/${tempId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: currentSignatureDataURL,
          deviceCode: deviceCode,
          deviceCodeType: deviceCodeType
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Fehler beim Speichern der Unterschrift");
      }

      setSuccess(true);

    } catch (err) {
      console.error("Fehler beim Speichern der Unterschrift:", err);
      setError(err instanceof Error ? err.message : "Fehler beim Speichern der Unterschrift");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Unterschriftsdaten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (error && !signatureData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Fehler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <Button onClick={() => window.close()} className="w-full">
              Schließen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="text-green-600 mb-2">
              <CheckCircle2 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Unterschrift erfolgreich übermittelt!
            </h3>
            <p className="text-green-700">
              Ihre Unterschrift wurde gespeichert. Sie können dieses Fenster nun schließen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Schritt 1: Terms und Kundendaten
  if (currentStep === "terms" && signatureData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">
                Reparaturauftrag und Geschäftsbedingungen
              </CardTitle>
              <p className="text-center text-gray-600 text-sm">
                {signatureData.repairData.shopName}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kundendaten */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Kundendaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p>{signatureData.repairData.customerName}</p>
                  </div>
                  {signatureData.repairData.customerData?.phone && (
                    <div>
                      <span className="font-medium">Telefon:</span>
                      <p>{signatureData.repairData.customerData.phone}</p>
                    </div>
                  )}
                  {signatureData.repairData.customerData?.email && (
                    <div>
                      <span className="font-medium">E-Mail:</span>
                      <p>{signatureData.repairData.customerData.email}</p>
                    </div>
                  )}
                  {signatureData.repairData.customerData?.address && (
                    <div className="col-span-full">
                      <span className="font-medium">Adresse:</span>
                      <p>{signatureData.repairData.customerData.address}</p>
                      {signatureData.repairData.customerData?.zipCode && signatureData.repairData.customerData?.city && (
                        <p>{signatureData.repairData.customerData.zipCode} {signatureData.repairData.customerData.city}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Gerätedaten */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Gerätedaten</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Gerät:</span>
                      <p>{signatureData.repairData.device}</p>
                    </div>
                    <div>
                      <span className="font-medium">Problem:</span>
                      <p>{signatureData.repairData.issue}</p>
                    </div>
                    {signatureData.repairData.estimatedCost && (
                      <div>
                        <span className="font-medium">Geschätzte Kosten:</span>
                        <p>{signatureData.repairData.estimatedCost}</p>
                      </div>
                    )}
                    {signatureData.repairData.depositAmount && (
                      <div>
                        <span className="font-medium">Anzahlung:</span>
                        <p>{signatureData.repairData.depositAmount}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reparaturbedingungen */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Reparaturbedingungen</h3>
                <div className="p-4 border rounded-lg text-sm space-y-3">
                  <p>• Die Reparatur wird nach bestem Wissen und Gewissen durchgeführt.</p>
                  <p>• Bei irreparablen Geräten fällt eine Diagnosepauschale an.</p>
                  <p>• Datenverlust kann nicht ausgeschlossen werden. Bitte erstellen Sie vorher ein Backup.</p>
                  <p>• Die Haftung ist auf den Gerätewert begrenzt.</p>
                  <p>• Abholung innerhalb von 30 Tagen nach Benachrichtigung, sonst fallen Lagerkosten an.</p>
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="flex-shrink-0 mt-0.5 w-4 h-4"
                />
                <label htmlFor="terms" className="text-sm leading-relaxed">
                  Ich habe die Reparaturbedingungen gelesen und akzeptiere diese. 
                  Ich beauftrage hiermit die Reparatur meines Gerätes.
                </label>
              </div>

              <Button
                onClick={handleTermsComplete}
                disabled={!termsAccepted}
                className="w-full"
              >
                Weiter zur Gerätecode-Eingabe
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Schritt 2: Device Code
  if (currentStep === "deviceCode" && signatureData) {
    return (
      <DeviceCodeStep
        onComplete={handleDeviceCodeComplete}
        shopName={signatureData.repairData.shopName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Querformat-Prompt */}
        {showLandscapePrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-center">Für bessere Unterschrift</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="text-6xl">📱↻</div>
                <p className="text-gray-700">
                  Drehen Sie Ihr Handy ins Querformat für eine komfortablere Unterschrift.
                </p>
                <Button 
                  onClick={() => setShowLandscapePrompt(false)}
                  variant="outline"
                  className="w-full"
                >
                  Trotzdem im Hochformat unterschreiben
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vollbild-Querformat-Modus */}
        {isLandscape && currentStep === "signature" && !showLandscapePrompt ? (
          <div className="fixed inset-0 bg-white z-40 flex flex-col p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Unterschrift - {signatureData?.repairData.shopName}</h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Löschen
                </Button>
                <Button
                  onClick={submitSignature}
                  disabled={signatureEmpty || submitting}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Speichern
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitte unterschreiben Sie hier:
              </label>
              <div className="border-2 border-gray-300 border-dashed rounded-lg bg-white h-full">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "w-full h-full cursor-crosshair",
                    style: { touchAction: 'none' }
                  }}
                  onBegin={handleSignatureBegin}
                  onEnd={handleSignatureEnd}
                />
              </div>
              <div className="flex items-center justify-center mt-2">
                <p className="text-xs text-gray-500">
                  Verwenden Sie Ihren Finger oder einen Stift zum Unterschreiben
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Normaler Hochformat-Modus */
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Digitale Unterschrift</CardTitle>
              {signatureData && (
                <p className="text-center text-gray-600">
                  {signatureData.repairData.shopName}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {signatureData && (
                <div className="space-y-6 mb-6">
                  {/* Kundendaten Verifikation - ganz oben */}
                  {signatureData.repairData.customerData && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h3 className="font-semibold text-blue-900 mb-3">Ihre Kontaktdaten</h3>
                      <div className="space-y-2 text-sm">
                        {/* Name */}
                        <div className="text-blue-900 font-medium">
                          {signatureData.repairData.customerData.firstName} {signatureData.repairData.customerData.lastName}
                        </div>
                        
                        {/* Adresse */}
                        {signatureData.repairData.customerData.address && (
                          <div className="text-blue-900">
                            {signatureData.repairData.customerData.address}
                          </div>
                        )}
                        
                        {/* PLZ und Ort */}
                        {(signatureData.repairData.customerData.zipCode || signatureData.repairData.customerData.city) && (
                          <div className="text-blue-900">
                            {signatureData.repairData.customerData.zipCode} {signatureData.repairData.customerData.city}
                          </div>
                        )}
                        
                        {/* Telefon */}
                        <div className="text-blue-900">
                          {signatureData.repairData.customerData.phone}
                        </div>
                        
                        {/* E-Mail */}
                        {signatureData.repairData.customerData.email && (
                          <div className="text-blue-900">
                            {signatureData.repairData.customerData.email}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reparaturdaten - ohne redundanten Kundennamen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Gerät:</span>
                      <p className="text-gray-900">{signatureData.repairData.device}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium text-gray-700">Problem:</span>
                      <p className="text-gray-900">{signatureData.repairData.issue}</p>
                    </div>
                    {signatureData.repairData.estimatedCost && (
                      <div>
                        <span className="font-medium text-gray-700">Kosten:</span>
                        <p className="text-gray-900">{signatureData.repairData.estimatedCost}</p>
                      </div>
                    )}
                    {signatureData.repairData.depositAmount && (
                      <div>
                        <span className="font-medium text-gray-700">Anzahlung:</span>
                        <p className="text-gray-900">{signatureData.repairData.depositAmount}</p>
                      </div>
                    )}
                  </div>

                  {/* Reparaturbedingungen */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3">Reparaturbedingungen</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><strong>1.</strong> Die Reparatur erfolgt nach bestem Wissen und mit geprüften Ersatzteilen. Originalteile können nicht in jedem Fall garantiert werden.</p>
                      <p><strong>2.</strong> Für etwaige Datenverluste wird keine Haftung übernommen. Der Kunde ist verpflichtet, vor Abgabe des Geräts eine vollständige Datensicherung vorzunehmen.</p>
                      <p><strong>3.</strong> Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die ausgeführten Arbeiten und eingesetzten Komponenten.</p>
                      <p><strong>4.</strong> Wird ein Kostenvoranschlag abgelehnt oder ist eine Reparatur nicht möglich, kann eine Überprüfungspauschale berechnet werden.</p>
                      <p><strong>5.</strong> Nicht abgeholte Geräte können nach 60 Tagen kostenpflichtig eingelagert oder entsorgt werden.</p>
                      <p><strong>6.</strong> Mit der Unterschrift bestätigt der Kunde die Beauftragung der Reparatur sowie die Anerkennung dieser Bedingungen.</p>
                    </div>

                  </div>
                </div>
              )}

              {error && (
                <Alert className="mb-4">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {currentStep === "signature" && !showLandscapePrompt && !isLandscape && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitte unterschreiben Sie hier:
                    </label>
                    <div className="border-2 border-gray-300 border-dashed rounded-lg bg-white">
                      <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                          className: "w-full h-48 cursor-crosshair",
                          style: { touchAction: 'none' }
                        }}
                        onBegin={handleSignatureBegin}
                        onEnd={handleSignatureEnd}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Verwenden Sie Ihren Finger oder einen Stift zum Unterschreiben
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Löschen
                      </Button>
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={submitSignature}
                        disabled={signatureEmpty || submitting}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Wird gespeichert...
                          </>
                        ) : (
                          <>
                            <PenTool className="h-4 w-4 mr-2" />
                            Unterschrift bestätigen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {currentStep !== "signature" && (
                <div className="pt-4 text-center">
                  <p className="text-gray-600 text-sm mb-4">
                    Bitte durchlaufen Sie zuerst alle Schritte des Unterschriftsprozesses.
                  </p>
                </div>
              )}

              {signatureData && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  Gültig bis: {new Date(signatureData.expiresAt).toLocaleString('de-DE')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}