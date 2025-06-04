import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, FileSignature } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { apiRequest } from "@/lib/queryClient";

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
  const [match, params] = useRoute("/signature/:tempId");
  const { tempId } = params || {};
  
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (!tempId) return;
    
    loadSignatureData();
  }, [tempId]);

  const loadSignatureData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest("GET", `/api/signature/customer/${tempId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Laden der Unterschriftsdaten");
      }
      
      setSignatureData(data);
      
      if (data.status === 'signed') {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Unterschriftsdaten:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError("Bitte leisten Sie Ihre Unterschrift");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const signatureDataURL = signatureRef.current.toDataURL();
      
      const response = await apiRequest("POST", `/api/signature/customer/${tempId}`, {
        signature: signatureDataURL
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Fehler beim Speichern der Unterschrift");
      }
      
      setSubmitted(true);
    } catch (err) {
      console.error("Fehler beim Speichern der Unterschrift:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSubmitting(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
    setError(null);
  };

  if (!match || !tempId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Ungültiger Link
              </h2>
              <p className="text-gray-600">
                Der Unterschrifts-Link ist ungültig oder wurde nicht korrekt aufgerufen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Laden...
              </h2>
              <p className="text-gray-600">
                Unterschriftsdaten werden geladen
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !signatureData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Fehler
              </h2>
              <p className="text-gray-600 mb-4">
                {error}
              </p>
              <Button onClick={loadSignatureData} variant="outline">
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unterschrift erfolgreich gespeichert!
              </h2>
              <p className="text-gray-600 mb-4">
                Vielen Dank! Ihre Unterschrift wurde erfolgreich gespeichert.
              </p>
              <p className="text-sm text-gray-500">
                Sie können dieses Fenster nun schließen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <FileSignature className="h-6 w-6 text-blue-600" />
              Digitale Unterschrift
            </CardTitle>
            <CardDescription>
              Bitte leisten Sie Ihre Unterschrift für die Reparaturaufnahme
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {signatureData && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Reparaturdetails:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Kunde:</span> {signatureData.repairData.customerName}
                  </div>
                  <div>
                    <span className="font-medium">Gerät:</span> {signatureData.repairData.device}
                  </div>
                  <div>
                    <span className="font-medium">Problem:</span> {signatureData.repairData.issue}
                  </div>
                  <div>
                    <span className="font-medium">Geschäft:</span> {signatureData.repairData.shopName}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Unterschrift leisten:
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Bitte unterschreiben Sie mit dem Finger oder einem Stylus in dem Feld unten.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className: 'signature-canvas w-full h-48 touch-action-none'
                  }}
                  backgroundColor="rgb(255,255,255)"
                  penColor="rgb(0,0,0)"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={clearSignature}
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                >
                  Löschen
                </Button>
                <Button
                  onClick={handleSubmitSignature}
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Unterschrift speichern"
                  )}
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Durch das Leisten Ihrer Unterschrift bestätigen Sie die Reparaturaufnahme
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}