import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function QRPrintTest() {
  const preloadedImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // QR-Code Base64-Daten
  const qrCodeBase64 = "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";

  // Beim ersten Laden das Bild vorladen
  useEffect(() => {
    // Bild vorladen
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      console.log('🎯 QR-Code Testbild erfolgreich geladen!');
    };
    img.onerror = () => {
      console.error('⚠️ Fehler beim Laden des QR-Code Testbilds!');
    };
    img.src = `data:image/png;base64,${qrCodeBase64}`;
    preloadedImageRef.current = img;
  }, []);

  const handlePrint = () => {
    console.log('🚀 QRPrintTest - starting basic print test');
    console.log('🚀 Bild vorgeladen:', imageLoaded);
    
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um den Test auszuführen.');
      return;
    }
    
    // Basis-HTML mit einem direkten <img> Element generieren
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Print Test</title>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 2cm;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              border: 1px solid #ccc;
              padding: 20px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 30px;
            }
            .qr-code-container {
              margin: 30px auto;
              width: 200px;
              height: 200px;
              padding: 0;
              border: 1px dashed #ccc;
            }
            p {
              margin: 20px 0;
              font-size: 14px;
            }
            .qr-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>QR-Code Print Test</h1>
            
            <div class="qr-code-container">
              <!-- Direktes Bild-Element ohne JavaScript-Verarbeitung -->
              <img src="data:image/png;base64,${qrCodeBase64}" class="qr-image" alt="QR Code">
            </div>
            
            <p>
              Dieser QR-Code sollte beim Drucken des Dokuments sichtbar sein.
              Wenn er nicht erscheint, gibt es ein Problem mit dem Drucksystem.
            </p>
          </div>
          
          <script>
            console.log('🖨️ Print-Dokument vollständig geladen');
            
            // Verzögertes Drucken, um sicherzustellen, dass Bilder geladen werden
            window.addEventListener('load', function() {
              console.log('🖨️ Window load-Event ausgelöst');
              document.querySelector('img').onload = function() {
                console.log('🖨️ QR-Code-Bild im Druckfenster vollständig geladen');
              };
              
              // 2 Sekunden warten, bevor das Drucken beginnt
              setTimeout(function() {
                console.log('🖨️ Starte Druckvorgang');
                window.print();
                
                // 1 Sekunde nach Druckbeginn Fenster schließen
                setTimeout(function() {
                  console.log('🖨️ Schließe Druckfenster');
                  window.close();
                }, 1000);
              }, 2000);
            });
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };
  
  return (
    <div className="flex flex-col p-4 border rounded-md bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">QR-Code Drucktest</h3>
      <p className="mb-4">
        Dieser Button führt einen einfachen Test aus, um zu prüfen, 
        ob ein QR-Code im Drucklayout korrekt angezeigt werden kann.
      </p>
      <div className="flex flex-col gap-4">
        <div className="border rounded p-4 bg-white mb-3">
          <p className="text-xs mb-2 font-medium">QR-Code Bild-Vorschau:</p>
          {/* Zeigt das vorgeladene Bild direkt in der UI an, damit wir sehen, ob es korrekt geladen wird */}
          <div className="flex justify-center">
            <img 
              src={`data:image/png;base64,${qrCodeBase64}`} 
              alt="QR-Code Testbild" 
              className="w-24 h-24 border"
              onLoad={() => console.log('🎯 QR-Code Bild in der Vorschau geladen')}
              onError={() => console.error('⚠️ Fehler beim Laden des QR-Code Bilds in der Vorschau')}
            />
          </div>
          <p className="text-xs mt-2 text-center text-muted-foreground">
            Status: {imageLoaded ? '✅ Bild erfolgreich vorgeladen' : '⏳ Bild wird geladen...'}  
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2 self-start" disabled={!imageLoaded}>
          <Printer className="h-4 w-4" />
          Verbesserten QR-Code Drucktest starten
        </Button>
      </div>
    </div>
  );
}
