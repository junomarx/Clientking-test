import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function QRPrintTest() {
  const handlePrint = () => {
    console.log('QRPrintTest - starting basic print test');
    
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um den Test auszuführen.');
      return;
    }
    
    // Extrem einfacher HTML-Inhalt mit eingebettetem QR-Code als Base64
    const simpleHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Test</title>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .test-container {
              border: 1px solid #ccc;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            h1 {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .qr-code {
              width: 150px;
              height: 150px;
              margin: 0 auto 20px auto;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="test-container">
            <h1>QR-Code Test</h1>
            <div class="qr-code">
              <img 
                src="data:image/png;base64,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" 
                alt="QR-Code Test"
              />
            </div>
            <p>Wenn Sie diese Seite drucken, sollte der QR-Code sichtbar sein.</p>
          </div>
          <script>
            // Ausgabe im Konsolenfenster zur Fehlersuche
            console.log('QR-Code Test Document loaded');
            
            // Nach 1 Sekunde drucken
            window.onload = function() {
              console.log('Document fully loaded, starting print...');
              setTimeout(function() {
                window.print();
                console.log('Print dialog should be visible now');
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 1000);
            };
          </script>
        </body>
      </html>
    `;
    
    // Schreiben und ausführen
    printWindow.document.write(simpleHTML);
    printWindow.document.close();
  };
  
  return (
    <div className="flex flex-col p-4 border rounded-md bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">QR-Code Drucktest</h3>
      <p className="mb-4">
        Dieser Button führt einen einfachen Test aus, um zu prüfen, 
        ob ein QR-Code im Drucklayout korrekt angezeigt werden kann.
      </p>
      <Button onClick={handlePrint} className="gap-2 self-start">
        <Printer className="h-4 w-4" />
        QR-Code Drucktest
      </Button>
    </div>
  );
}
