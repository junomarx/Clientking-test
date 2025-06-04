import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, PenTool, RotateCcw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureData {
  tempId: string;
  repairData: {
    customerName: string;
    device: string;
    issue: string;
    shopName: string;
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

  useEffect(() => {
    if (tempId) {
      fetchSignatureData();
    }
  }, [tempId]);

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
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureEmpty(true);
    }
  };

  const submitSignature = async () => {
    if (!signatureRef.current || signatureEmpty) {
      setError("Bitte leisten Sie zuerst Ihre Unterschrift.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const signatureDataURL = signatureRef.current.toDataURL();

      const response = await fetch(`/api/signature/customer/${tempId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureDataURL
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Speichern der Unterschrift");
      }

      setSuccess(true);

    } catch (err) {
      console.error("Fehler beim Speichern der Unterschrift:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Unterschrift erfolgreich
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 mb-4">
              Vielen Dank! Ihre Unterschrift wurde erfolgreich gespeichert.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Sie können dieses Fenster nun schließen.
            </p>
            <Button onClick={() => window.close()} className="w-full">
              Schließen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Kunde:</span>
                    <p className="text-gray-900">{signatureData.repairData.customerName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Gerät:</span>
                    <p className="text-gray-900">{signatureData.repairData.device}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Problem:</span>
                    <p className="text-gray-900">{signatureData.repairData.issue}</p>
                  </div>
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

              {signatureData && (
                <p className="text-xs text-gray-500 text-center">
                  Gültig bis: {new Date(signatureData.expiresAt).toLocaleString('de-DE')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}