import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Undo2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
  initialValue?: string;
  readOnly?: boolean;
}

export function SignaturePadComponent({
  onSave,
  onCancel,
  width = 400,
  height = 200,
  initialValue,
  readOnly = false
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // Falls ein initialValue vorhanden ist, diesen beim Laden anzeigen
  useEffect(() => {
    if (initialValue && sigCanvas.current) {
      sigCanvas.current.fromDataURL(initialValue);
      setIsEmpty(false);
    }
  }, [initialValue]);
  
  // Signatur leeren
  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  };
  
  // Signatur speichern
  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      const dataURL = sigCanvas.current.toDataURL('image/png');
      onSave(dataURL);
    }
  };
  
  // Überprüfen, ob die Signatur leer ist
  const checkIfEmpty = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className="border rounded bg-white" 
        style={{ width: width, height: height }}
      >
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            width: width,
            height: height,
            className: 'signature-canvas',
            style: { width: '100%', height: '100%' },
            // readOnly wird als data-Attribut hinzugefügt, da die Komponente readOnly nicht direkt unterstützt
            ...(readOnly ? { 'data-readonly': 'true' } : {})
          }}
          onEnd={checkIfEmpty}
          backgroundColor="white"
          clearOnResize={false}
        />
      </div>
      
      {!readOnly && (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isEmpty}
            className="flex items-center gap-1"
          >
            <Undo2 className="h-4 w-4" />
            Löschen
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Abbrechen
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isEmpty}
            className="flex items-center gap-1"
          >
            <Check className="h-4 w-4" />
            Speichern
          </Button>
        </div>
      )}
    </div>
  );
}
