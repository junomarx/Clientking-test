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

  // Zeilen mit leeren Werten oder fehlenden Unterschriften entfernen
  // Suche nach allen HTML-Elementen, die einen Platzhalter enthalten
  const placeholderRegex = /\<[^>]*\{\{([^\}]+)\}\}[^>]*\>/g;
  const matches = [...templateHtml.matchAll(placeholderRegex)];
  
  // Für jedes gefundene Element prüfen, ob der Wert leer oder eine nicht vorhandene Unterschrift ist
  matches.forEach(match => {
    const fullMatch = match[0]; // Das komplette HTML-Element
    const placeholderName = match[1]; // Der Name des Platzhalters

    // Bei Unterschriften spezielle Behandlung
    if (placeholderName === 'customerSignature' || placeholderName === 'secondSignature') {
      const value = variables[placeholderName];
      
      // Wenn keine Unterschrift vorhanden ist
      if (!value || value.trim() === '') {
        // Die ganze Zeile/Element mit dem Platzhalter entfernen
        // Suche nach dem übergeordneten Element (meist ein div oder p)
        const regex = new RegExp(`\\s*<(div|p|tr|section)[^>]*>[^<]*${fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<\/(div|p|tr|section)>\\s*`, 'gi');
        result = result.replace(regex, '');
      } else {
        // Wenn eine Unterschrift vorhanden ist, ersetze den Platzhalter durch ein img-Element
        result = result.replace(
          new RegExp(`\\{\\{${placeholderName}\\}\\}`, 'g'), 
          `<img src="${value}" alt="Unterschrift" style="max-width: 100%; height: auto; max-height: 80px;" />`
        );
      }
    } 
    // Für alle anderen Felder: Zeilen mit leeren Werten entfernen
    else {
      const value = variables[placeholderName];
      
      if (!value || value.trim() === '') {
        // Die ganze Zeile/Element mit dem Platzhalter entfernen
        // Suche nach dem übergeordneten Element (meist ein div oder p)
        const regex = new RegExp(`\\s*<(div|p|tr|section)[^>]*>[^<]*${fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<\/(div|p|tr|section)>\\s*`, 'gi');
        result = result.replace(regex, '');
      } else {
        // Normaler Platzhalter-Ersatz für nicht-leere Werte
        const placeholder = new RegExp(`\\{\\{${placeholderName}\\}\\}`, 'g');
        result = result.replace(placeholder, value);
      }
    }
  });

  // Restliche Platzhalter ersetzen, die nicht in HTML-Elementen eingebettet sind
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\{\{${key}\}\}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  
  // Prüfen auf nicht ersetzte Platzhalter
  const remainingPlaceholders = result.match(/\{\{[^\}]+\}\}/g);
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
    const response = await fetch(`/api/print-templates/${templateType}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Druckvorlage: ${response.status}`);
    }
    
    const template = await response.json();
    console.log(`Druckvorlage vom Typ '${templateType}' geladen:`, template.name);
    console.log('Vorlage enthält diese Platzhalter:', (template.content.match(/\{\{[^\}]+\}\}/g) || []));
    return template.content;
  } catch (error) {
    console.error('Fehler beim Laden der Druckvorlage:', error);
    return null;
  }
}