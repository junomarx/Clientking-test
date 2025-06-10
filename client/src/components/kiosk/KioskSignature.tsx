import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, PenTool, RotateCcw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useToast } from "@/hooks/use-toast";

interface SignatureRequest {
  repairId: number;
  customerName: string;
  repairDetails: string;
  timestamp: number;
}

interface KioskSignatureProps {
  signatureRequest: SignatureRequest | null;
  onComplete: () => void;
  onCancel: () => void;
}

export function KioskSignature({ signatureRequest, onComplete, onCancel }: KioskSignatureProps) {
  const [deviceCode, setDeviceCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const { toast } = useToast();

  if (!signatureRequest) {
    return null;
  }

  const handleSignatureBegin = () => {
    setHasSignature(true);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setHasSignature(true);
    } else {
      setHasSignature(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setHasSignature(false);
    }
  };

  const canSubmit = () => {
    return acceptedTerms && hasSignature && !signatureRef.current?.isEmpty();
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !signatureRef.current) return;

    setIsSubmitting(true);
    try {
      // Unterschrift als Base64 konvertieren
      const signatureData = signatureRef.current.toDataURL();

      const response = await fetch('/api/kiosk-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repairId: signatureRequest.repairId,
          signature: signatureData,
          deviceCode: deviceCode.trim() || null,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        toast({
          title: "Unterschrift gespeichert",
          description: "Vielen Dank! Ihre Unterschrift wurde erfolgreich gespeichert.",
        });
        onComplete();
      } else {
        throw new Error('Fehler beim Speichern der Unterschrift');
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Unterschrift konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <PenTool className="h-16 w-16 text-orange-600" />
            </div>
            <CardTitle className="text-3xl text-gray-900">
              Unterschrift erforderlich
            </CardTitle>
            <p className="text-lg text-gray-600 mt-2">
              Bitte überprüfen Sie die Details und unterschreiben Sie
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Reparatur-Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Reparatur-Details:</h3>
              <p><strong>Kunde:</strong> {signatureRequest.customerName}</p>
              <p><strong>Details:</strong> {signatureRequest.repairDetails}</p>
              <p><strong>Reparatur-ID:</strong> #{signatureRequest.repairId}</p>
            </div>

            {/* Gerätecode (optional) */}
            <div className="space-y-2">
              <Label htmlFor="deviceCode" className="text-lg font-medium">
                Gerätecode/Muster <span className="text-gray-500">(optional)</span>
              </Label>
              <Input
                id="deviceCode"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="Falls vorhanden, geben Sie hier Ihren Gerätecode ein"
                className="h-12 text-lg"
              />
            </div>

            {/* AGB Checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-base leading-relaxed cursor-pointer">
                Ich bestätige, dass ich die Reparatur in Auftrag gebe und mit den 
                Allgemeinen Geschäftsbedingungen einverstanden bin. Die angegebenen 
                Kosten und Reparaturbedingungen akzeptiere ich.
              </Label>
            </div>

            {/* Unterschrift Canvas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-medium">
                  Unterschrift *
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="text-sm"
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Löschen
                </Button>
              </div>
              
              <div className="border-2 border-gray-300 rounded-lg bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 800,
                    height: 200,
                    className: 'signature-canvas w-full h-48 touch-action-none'
                  }}
                  onBegin={handleSignatureBegin}
                  onEnd={handleSignatureEnd}
                />
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Unterschreiben Sie mit Finger oder Stylus in dem Feld oben
              </p>
            </div>

            {/* Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-14 text-lg"
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Abbrechen
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit() || isSubmitting}
                className="flex-1 h-14 text-lg bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  "Speichern..."
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Unterschrift speichern
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}