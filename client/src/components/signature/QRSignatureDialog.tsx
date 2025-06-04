import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, QrCode, CheckCircle2, XCircle, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QRSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: {
    id: number;
    customerName: string;
    device: string;
    issue: string;
    status?: string;
    estimatedCost?: string;
    depositAmount?: string;
    customerId?: number;
  };
  businessName: string;
  signatureType?: 'dropoff' | 'pickup'; // Made optional as we'll determine it automatically
}

interface SignatureResponse {
  success: boolean;
  tempId: string;
  signatureUrl: string;
  expiresAt: string;
}

interface SignatureStatus {
  status: 'pending' | 'signed' | 'completed';
  signedAt?: string;
  customerSignature?: string;
  expiresAt: string;
}

// Function to determine signature type based on repair status
function determineSignatureType(status?: string): 'dropoff' | 'pickup' {
  if (status === 'eingegangen') {
    return 'dropoff'; // Abgabe-Unterschrift für Status "Eingegangen"
  } else if (status === 'fertig') {
    return 'pickup'; // Abhol-Unterschrift für Status "Fertig zur Abholung"
  }
  // Default fallback
  return 'dropoff';
}

export function QRSignatureDialog({ open, onOpenChange, repair, businessName, signatureType }: QRSignatureDialogProps) {
  // Determine the actual signature type to use
  const actualSignatureType = signatureType || determineSignatureType(repair.status);
  const [loading, setLoading] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureResponse | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !signatureData) {
      generateQRCode();
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [open]);

  useEffect(() => {
    if (signatureData && signatureStatus?.status === 'pending') {
      // Polling für Status-Updates starten
      const interval = setInterval(() => {
        checkSignatureStatus();
      }, 2000);
      setPollInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [signatureData, signatureStatus?.status]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const repairData = {
        repairId: repair.id,
        signatureType: actualSignatureType,
        customerName: repair.customerName,
        device: repair.device,
        issue: repair.issue,
        shopName: businessName,
        estimatedCost: repair.estimatedCost ? `${repair.estimatedCost} €` : undefined,
        depositAmount: repair.depositAmount ? `${repair.depositAmount} €` : undefined,
        customerId: repair.customerId
      };



      const response = await apiRequest("POST", "/api/signature/generate-qr", {
        repairData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Generieren des QR-Codes");
      }

      setSignatureData(data);
      setSignatureStatus({ status: 'pending', expiresAt: data.expiresAt });
      
    } catch (err) {
      console.error("Fehler beim Generieren des QR-Codes:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const checkSignatureStatus = async () => {
    if (!signatureData) return;

    try {
      const response = await apiRequest("GET", `/api/signature/status/${signatureData.tempId}`);
      const data = await response.json();

      if (response.ok) {
        setSignatureStatus(data);
        
        if (data.status === 'signed') {
          toast({
            title: "Unterschrift erhalten!",
            description: "Der Kunde hat die Unterschrift geleistet.",
          });
        }
      }
    } catch (err) {
      console.error("Fehler beim Prüfen des Unterschriftsstatus:", err);
    }
  };

  const completeSignature = async () => {
    if (!signatureData || signatureStatus?.status !== 'signed') return;

    try {
      setLoading(true);
      
      const response = await apiRequest("POST", `/api/signature/complete/${signatureData.tempId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Abschließen der Unterschrift");
      }

      setSignatureStatus(prev => prev ? { ...prev, status: 'completed' } : null);
      
      // Invalidate repairs cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', repair.id] });
      
      toast({
        title: "Unterschrift abgeschlossen",
        description: "Die Kundenunterschrift wurde erfolgreich zur Reparatur hinzugefügt.",
      });

      // Close dialog after successful completion
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (err) {
      console.error("Fehler beim Abschließen der Unterschrift:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!signatureData?.signatureUrl) return;

    try {
      await navigator.clipboard.writeText(signatureData.signatureUrl);
      toast({
        title: "Link kopiert",
        description: "Der Unterschrifts-Link wurde in die Zwischenablage kopiert.",
      });
    } catch (err) {
      console.error("Fehler beim Kopieren:", err);
      toast({
        title: "Kopieren fehlgeschlagen",
        description: "Der Link konnte nicht kopiert werden.",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    if (!signatureData?.signatureUrl) return;
    window.open(signatureData.signatureUrl, '_blank');
  };

  const resetDialog = () => {
    setSignatureData(null);
    setSignatureStatus(null);
    setError(null);
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const getStatusColor = () => {
    switch (signatureStatus?.status) {
      case 'pending': return 'text-orange-600';
      case 'signed': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (signatureStatus?.status) {
      case 'pending': return 'Warten auf Unterschrift...';
      case 'signed': return 'Unterschrift erhalten';
      case 'completed': return 'Abgeschlossen';
      default: return 'Unbekannt';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR-Code Unterschrift - {actualSignatureType === 'dropoff' ? 'Abgabe' : 'Abholung'}
          </DialogTitle>
          <DialogDescription>
            {actualSignatureType === 'dropoff' 
              ? 'Abgabe-Unterschrift: Lassen Sie den Kunden bei der Geräte-Abgabe den QR-Code scannen und digital unterschreiben'
              : 'Abhol-Unterschrift: Lassen Sie den Kunden bei der Geräte-Abholung den QR-Code scannen und digital unterschreiben'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reparaturdetails */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Kunde:</span> {repair.customerName}</div>
                <div><span className="font-medium">Gerät:</span> {repair.device}</div>
                <div><span className="font-medium">Problem:</span> {repair.issue}</div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && !signatureData && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-sm text-gray-600">QR-Code wird generiert...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Fehler</span>
              </div>
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <Button onClick={generateQRCode} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* QR Code Display */}
          {signatureData && !error && (
            <div className="space-y-4">
              {/* Status */}
              <div className="text-center">
                <div className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </div>
                {signatureStatus?.status === 'pending' && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-gray-500">Aktualisierung...</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              {signatureStatus?.status !== 'completed' && (
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 text-center">
                  <QRCodeSVG 
                    value={signatureData.signatureUrl}
                    size={200}
                    level="M"
                    includeMargin={true}
                    className="mx-auto"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Gültig bis: {new Date(signatureData.expiresAt).toLocaleString('de-DE')}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {signatureStatus?.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Link kopieren
                    </Button>
                    <Button onClick={openInNewTab} variant="outline" size="sm" className="flex-1">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Öffnen
                    </Button>
                  </div>
                )}

                {signatureStatus?.status === 'signed' && (
                  <Button onClick={completeSignature} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wird abgeschlossen...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Unterschrift abschließen
                      </>
                    )}
                  </Button>
                )}

                {signatureStatus?.status === 'completed' && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">Unterschrift erfolgreich abgeschlossen!</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Die Kundenunterschrift wurde zur Reparatur hinzugefügt.
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {signatureStatus?.status === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm">
                    <strong>Anleitung:</strong> Lassen Sie den Kunden den QR-Code mit seinem Smartphone scannen. 
                    Er wird dann zur Unterschriftsseite weitergeleitet und kann digital unterschreiben.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleClose} variant="outline">
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}