/**
 * Hilfsfunktionen für den Druck von Kostenvoranschlägen
 */
export function printDocument(content: string, title: string = 'Kostenvoranschlag'): void {
  // Erstelle ein neues Fenster für den Druck
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um das Dokument zu drucken.');
    return;
  }
  
  // Füge Inhalt hinzu
  printWindow.document.write(content);
  printWindow.document.title = title;
  
  // Schließe das Dokument
  printWindow.document.close();
  
  // Warte bis alle Ressourcen geladen sind und drucke dann
  printWindow.onload = () => {
    printWindow.print();
    // Fenster schließen nach dem Druck (optional, könnte auf false gesetzt werden)
    // printWindow.onafterprint = () => printWindow.close();
  };
}

/**
 * Hilfsfunktion zum Exportieren des Inhalts als PDF Datei
 * 
 * Diese Funktion emuliert einen PDF-Export, indem sie den Browser-Druckdialog öffnet
 * und dem Benutzer ermöglicht, als PDF zu speichern.
 */
export function exportAsPdf(content: string, filename: string = 'Kostenvoranschlag'): void {
  // Da wir keinen direkten PDF-Export haben, nutzen wir den Druckdialog
  // Der Benutzer kann dann "Als PDF speichern" wählen
  printDocument(content, filename);
}