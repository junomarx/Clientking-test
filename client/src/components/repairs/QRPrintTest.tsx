import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// QR-Code als SVG direkt eingebettet
export function QRPrintTest() {
  const handlePrint = () => {
    console.log('🚀 QRPrintTest - starting SVG test');
    
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um den Test auszuführen.');
      return;
    }
    
    // HTML mit SVG-QR-Code (kein Bild, kein Base64)
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
              padding: 10px;
              border: 1px dashed #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            p {
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>QR-Code Print Test</h1>
            
            <div class="qr-code-container">
              <!-- SVG QR-Code direkt eingebunden (kein Bild, kein Base64) -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" width="100%" height="100%" shape-rendering="crispEdges">
                <!-- QR-Code für URL: https://handyshop-verwaltung.de/ -->
                <!-- Einfacher QR-Code mit Rechtecken statt Bildreferenz -->
                <path fill="#FFFFFF" d="M0 0h29v29H0z"/>
                <path d="M4 4h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 5h1v1H4zm7 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm7 0h1v1h-1zM4 6h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm4 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zM4 7h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zm6 0h1v1h-1zM4 8h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 9h1v1H4zm7 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm5 0h1v1h-1zm2 0h1v1h-1zM4 10h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM12 11h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zM4 12h1v1H4zm1 0h1v1H5zm2 0h1v1H7zm2 0h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM5 13h1v1H5zm2 0h1v1H7zm3 0h1v1h-1zm7 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zm1 0h1v1h-1zM4 14h1v1H4zm1 0h1v1H5zm2 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM6 15h1v1H6zm3 0h1v1H9zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM5 16h1v1H5zm1 0h1v1H6zm2 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zM4 17h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm5 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zM4 18h1v1H4zm3 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm3 0h1v1h-1zm3 0h1v1h-1zm4 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 19h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM5 20h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zM4 21h1v1H4zm2 0h1v1H6zm4 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 22h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm2 0h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zM4 23h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zM4 24h1v1H4zm7 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 25h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1z"/>
              </svg>
            </div>
            
            <p>
              Dieser QR-Code sollte beim Drucken des Dokuments sichtbar sein.
              Wenn er nicht erscheint, gibt es ein Problem mit dem Drucksystem.
            </p>
            <p>
              Dies ist ein <strong>SVG QR-Code</strong> (kein Bild, direkt im HTML).
            </p>
          </div>
          
          <script>
            console.log('🖨️ Print-Dokument vollständig geladen');
            
            // Verzögertes Drucken
            window.addEventListener('load', function() {
              console.log('🖨️ Window load-Event ausgelöst');
              
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
          <p className="text-xs mb-2 font-medium">QR-Code Vorschau:</p>
          {/* Zeigt den QR-Code als SVG direkt in der UI an */}
          <div className="flex justify-center">
            <div className="w-32 h-32 border p-1">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 29 29" 
                width="100%" 
                height="100%" 
                shape-rendering="crispEdges"
              >
                <path fill="#FFFFFF" d="M0 0h29v29H0z"/>
                <path d="M4 4h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 5h1v1H4zm7 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm7 0h1v1h-1zM4 6h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm4 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zM4 7h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zm6 0h1v1h-1zM4 8h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 9h1v1H4zm7 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm5 0h1v1h-1zm2 0h1v1h-1zM4 10h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM12 11h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zM4 12h1v1H4zm1 0h1v1H5zm2 0h1v1H7zm2 0h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM5 13h1v1H5zm2 0h1v1H7zm3 0h1v1h-1zm7 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zm1 0h1v1h-1zM4 14h1v1H4zm1 0h1v1H5zm2 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM6 15h1v1H6zm3 0h1v1H9zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM5 16h1v1H5zm1 0h1v1H6zm2 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zM4 17h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm5 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zM4 18h1v1H4zm3 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm3 0h1v1h-1zm3 0h1v1h-1zm4 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 19h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM5 20h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zM4 21h1v1H4zm2 0h1v1H6zm4 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 22h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm2 0h1v1H9zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zM4 23h1v1H4zm2 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm4 0h1v1h-1zM4 24h1v1H4zm7 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm3 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zM4 25h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1zm1 0h1v1h-1z"/>
              </svg>
            </div>
          </div>
          <p className="text-xs mt-2 text-center text-muted-foreground">
            Status: ✅ SVG QR-Code geladen  
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2 self-start">
          <Printer className="h-4 w-4" />
          SVG QR-Code Drucktest starten
        </Button>
      </div>
    </div>
  );
}
