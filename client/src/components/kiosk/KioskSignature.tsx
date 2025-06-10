import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PenTool, RotateCcw, Check, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useKioskMode } from '@/hooks/use-kiosk-mode';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface KioskSignatureProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function KioskSignature({ onCancel, onSuccess }: KioskSignatureProps) {
  const { toast } = useToast();
  const { signatureRequest, clearSignatureRequest } = useKioskMode();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitSignatureMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      console.log('Kiosk: Sende Unterschrift für repairId:', signatureRequest?.repairId);
      const response = await apiRequest('POST', '/api/kiosk-signature', {
        repairId: signatureRequest?.repairId,
        signature: signatureData,
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
    
    const signatureData = sigCanvas.current.toDataURL();
    if (sigCanvas.current.isEmpty()) {
      toast({
        title: 'Unterschrift fehlt',
        description: 'Bitte setzen Sie Ihre Unterschrift auf die Fläche.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
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

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PenTool className="h-8 w-8" />
          <h1 className="text-2xl font-semibold">Unterschrift erforderlich</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-white hover:bg-blue-500"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              Bitte setzen Sie hier Ihre Unterschrift
            </CardTitle>
            <p className="text-center text-gray-600">
              Kunde: {signatureRequest.customerName}
            </p>
            <p className="text-center text-sm text-gray-500">
              {signatureRequest.repairDetails}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signature Canvas */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  width: 800,
                  height: 300,
                  className: 'signature-canvas w-full h-full'
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="lg"
                onClick={handleClear}
                className="px-6 py-3"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Zurücksetzen
              </Button>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="px-6 py-3"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Übertragen...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5" />
                      Unterschrift bestätigen
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}