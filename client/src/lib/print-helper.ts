/**
 * Hilfsfunktionen für Druckvorlagen
 */

/**
 * Ersetzt Platzhalter im Template durch die entsprechenden Werte
 * Platzhalter haben das Format {{variableName}}
 */
export function applyTemplateVariables(templateHtml: string, variables: Record<string, string>): string {
  // Falls kein Template vorhanden, leeren String zurückgeben
  if (!templateHtml) return '';
  
  let result = templateHtml;
  
  // Alle Platzhalter im Format {{variableName}} durch die entsprechenden Werte ersetzen
  console.log('Template-Variablen:', variables);
  
  // Spezielle Behandlung für Logo-URL - kann entweder businessLogo oder logoUrl sein
  if (variables.businessLogo && !variables.logoUrl) {
    variables = { ...variables, logoUrl: variables.businessLogo };
  } else if (variables.logoUrl && !variables.businessLogo) {
    variables = { ...variables, businessLogo: variables.logoUrl };
  }

  // Spezielle Behandlung für Order Code und Datum - doppelte Namen verwenden
  if (variables.orderCode && !variables.repairId) {
    variables = { ...variables, repairId: variables.orderCode };
  } else if (variables.repairId && !variables.orderCode) {
    variables = { ...variables, orderCode: variables.repairId };
  }

  if (variables.creationDate && !variables.currentDate) {
    variables = { ...variables, currentDate: variables.creationDate };
  } else if (variables.currentDate && !variables.creationDate) {
    variables = { ...variables, creationDate: variables.currentDate };
  }

  // Spezielle Behandlung für Unterschriften - vorverarbeiten, damit sie als Bilder angezeigt werden
  if (variables.customerSignature && variables.customerSignature.trim() !== '') {
    const customerSignatureImg = '<img src="' + variables.customerSignature + '" alt="Unterschrift" style="max-width: 100%; height: auto; max-height: 80px;" />';
    result = result.replace(/{{customerSignature}}/g, customerSignatureImg);
  }
  
  if (variables.secondSignature && variables.secondSignature.trim() !== '') {
    const secondSignatureImg = '<img src="' + variables.secondSignature + '" alt="Unterschrift" style="max-width: 100%; height: auto; max-height: 80px;" />';
    result = result.replace(/{{secondSignature}}/g, secondSignatureImg);
  }

  // Entferne Zeilen mit leeren Werten
  // 1. Sammle alle noch vorhandenen Platzhalter
  const placeholderMatches = result.match(/{{([^}]+)}}/g) || [];
  
  // 2. Für jeden noch vorhandenen Platzhalter
  placeholderMatches.forEach(placeholderWithBraces => {
    // Extrahiere den Namen des Platzhalters ohne {{}}
    const placeholder = placeholderWithBraces.replace(/[{}]/g, '');
    const value = variables[placeholder] || '';
    
    // Wenn der Wert leer ist
    if (value.trim() === '') {
      try {
        // Suche nach HTML-Elementen, die diesen Platzhalter enthalten
        // Verwende einen einfachen Ansatz ohne komplexe RegEx
        if (result.includes(placeholderWithBraces)) {
          // Suche nach dem Anfang des HTML-Elements, das den Platzhalter enthält
          const startElementIndex = result.lastIndexOf('<', result.indexOf(placeholderWithBraces));
          if (startElementIndex >= 0) {
            // Suche nach dem Ende des Elements
            const endElementIndex = result.indexOf('>', result.indexOf(placeholderWithBraces)) + 1;
            if (endElementIndex > 0) {
              // Entferne das komplette HTML-Element
              const elementToRemove = result.substring(startElementIndex, endElementIndex);
              result = result.replace(elementToRemove, '');
            }
          }
        }
      } catch (e) {
        console.error('Fehler beim Entfernen von leeren Werten:', e);
      }
    } else {
      // Normalen Platzhalterersatz durchführen
      result = result.replace(new RegExp('{{' + placeholder + '}}', 'g'), value);
    }
  });
  
  // Prüfen auf nicht ersetzte Platzhalter
  const remainingPlaceholders = result.match(/{{[^}]+}}/g);
  if (remainingPlaceholders) {
    console.warn('Nicht ersetzte Platzhalter:', remainingPlaceholders);
  }
  
  return result;
}

/**
 * Lädt die aktuelle Druckvorlage vom Server
 */
export async function fetchLatestPrintTemplate(templateType: string): Promise<string | null> {
  try {
    const response = await fetch('/api/print-templates/' + templateType, {
      headers: {
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      }
    });
    
    if (!response.ok) {
      throw new Error('Fehler beim Laden der Druckvorlage: ' + response.status);
    }
    
    const template = await response.json();
    console.log('Druckvorlage vom Typ ' + templateType + ' geladen:', template.name);
    
    // Finde alle Platzhalter in der Vorlage
    const placeholders = template.content.match(/{{[^}]+}}/g) || [];
    console.log('Vorlage enthält diese Platzhalter:', placeholders);
    
    return template.content;
  } catch (error) {
    console.error('Fehler beim Laden der Druckvorlage:', error);
    return null;
  }
}