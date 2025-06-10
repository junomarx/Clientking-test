import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomSignaturePad } from '@/components/ui/signature-pad';
import { PenTool, CheckCircle, X, RotateCcw, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!signatureRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <PenTool className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Keine Unterschrifts-Anfrage
            </h2>
            <p className="text-gray-500">
              Warten auf Unterschrifts-Anfrage vom Hauptgerät...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSignatureSubmit = async (signature: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/kiosk-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repairId: signatureRequest.repairId,
          signature: signature,
          timestamp: Date.now()
        }),
      });

      if (response.ok) {
        toast({
          title: 'Unterschrift gespeichert',
          description: 'Ihre Unterschrift wurde erfolgreich übermittelt.',
        });
        onComplete();
      } else {
        throw new Error('Fehler beim Speichern der Unterschrift');
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Die Unterschrift konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    toast({
      title: 'Unterschrift abgebrochen',
      description: 'Der Unterschriftsvorgang wurde abgebrochen.',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-green-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center">
                <PenTool className="mr-3 h-8 w-8" />
                Digitale Unterschrift
              </CardTitle>
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-green-700"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Kundeninformationen */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <User className="mr-2 h-5 w-5" />
                Reparaturdetails
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Kunde:</span>
                  <p className="text-blue-700">{signatureRequest.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Reparatur-ID:</span>
                  <p className="text-blue-700">#{signatureRequest.repairId}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-blue-800">Details:</span>
                  <p className="text-blue-700">{signatureRequest.repairDetails}</p>
                </div>
              </div>
            </div>

            {/* Unterschrifts-Anweisungen */}
            <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2">
                Bitte unterschreiben Sie hier:
              </h3>
              <p className="text-amber-800 text-sm">
                Durch Ihre Unterschrift bestätigen Sie die Übergabe/Abholung Ihres Geräts 
                und die Richtigkeit der oben genannten Informationen.
              </p>
            </div>

            {/* Unterschriften-Pad */}
            <div className="mb-6">
              <CustomSignaturePad
                onSave={handleSignatureSubmit}
                onCancel={handleCancel}
                width={600}
                height={300}
              />
            </div>

            {/* Zusätzliche Informationen */}
            <div className="text-xs text-gray-500 text-center border-t pt-4">
              <p>
                Diese digitale Unterschrift hat dieselbe rechtliche Gültigkeit wie eine handschriftliche Unterschrift.
              </p>
              <p className="mt-1">
                Erstellt am: {new Date(signatureRequest.timestamp).toLocaleString('de-DE')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}