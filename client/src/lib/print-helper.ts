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
  
  // Spezielle Behandlung für Fehlerbeschreibungen:
  // 1. Ersetze Kommas durch Zeilenumbrüche mit <br>-Tags
  // 2. Ersetze vorhandene Zeilenumbrüche ebenfalls durch <br>-Tags
  // So wird jeder Fehler in einer eigenen Zeile angezeigt
  if (variables.deviceIssue) {
    variables = { 
      ...variables, 
      deviceIssue: variables.deviceIssue
        .split(/,\s*/)               // Teile bei Kommas (mit optionalem Leerzeichen danach)
        .map(item => item.trim())    // Entferne Leerzeichen am Anfang und Ende
        .filter(item => item)        // Entferne leere Einträge
        .join('<br>')                // Füge mit <br> wieder zusammen
        .replace(/\n/g, '<br>')      // Ersetze auch manuelle Zeilenumbrüche
    };
  }
  
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
    
    console.log(`Verarbeite Platzhalter: ${placeholder} = "${value}"`);
    
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
    console.log('Verfügbare Variablen:', Object.keys(variables));
  }
  
  return result;
}

/**
 * Lädt die aktuelle Druckvorlage vom Server
 */
export async function fetchLatestPrintTemplate(templateType: string): Promise<string | null> {
  try {
    // Benutzer-ID aus localStorage holen für zusätzliche Authentifizierung
    const userId = localStorage.getItem('userId');
    
    const response = await fetch('/api/print-templates/' + templateType, {
      credentials: 'include',
      headers: {
        'X-User-ID': userId || '',
      }
    });
    
    if (!response.ok) {
      console.error(`Fehler beim Laden der Druckvorlage ${templateType}: Status ${response.status}`);
      
      // Fallback für Demo-Shop: Standard-Druckvorlage zurückgeben
      if (response.status === 401) {
        console.log('Verwende Standard-Druckvorlage für den Demo-Shop');
        return getDefaultTemplate(templateType);
      }
      
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
    // Fallback: Standard-Vorlage zurückgeben
    return getDefaultTemplate(templateType);
  }
}

/**
 * Gibt eine Standard-Druckvorlage zurück als Fallback
 */
function getDefaultTemplate(templateType: string): string {
  switch (templateType) {
    case 'receipt_58mm':
      return `
<div style="font-family: Arial, sans-serif; font-size: 11px; width: 58mm; margin: 0; padding: 10px;">
  <div style="text-align: center; margin-bottom: 5px;">
    {{businessLogo}}
  </div>
  
  <div style="text-align: center; margin-bottom: 10px;">
    <strong>{{businessName}}</strong><br />
    {{businessAddress}}<br />
    {{businessPhone}}
  </div>
  
  <div style="text-align: center; margin: 10px 0 15px;">
    <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">Abholschein</div>
    <div style="font-weight: bold; font-size: 12px;">{{repairId}}</div>
    <div>{{currentDate}}</div>
  </div>
  
  <div style="margin-bottom: 14px;">
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">{{customerName}}</div>
    <div style="margin-bottom: 3px;">{{customerPhone}}</div>
    <div style="margin-bottom: 3px;">{{customerEmail}}</div>
  </div>
  
  <div style="margin-bottom: 14px;">
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">
      {{deviceBrand}} {{deviceModel}}
    </div>
    
    <div style="font-weight: bold; margin-top: 6px; margin-bottom: 2px;">Schaden/Fehler</div>
    <div>{{deviceIssue}}</div>
    
    <div style="font-weight: bold; font-size: 11px; margin-top: 8px; margin-bottom: 2px;">Reparaturkosten</div>
    <div>{{preis}}</div>
  </div>
  
  <div style="border: 1px solid #000; padding: 6px; font-size: 9px; line-height: 1.3; margin-bottom: 14px;">
    <div style="text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 4px;">Reparaturbedingungen</div>
    1. Keine Haftung für Datenverlust – Kunde ist verantwortlich.<br /><br />
    2. Reparatur mit geprüften, ggf. nicht originalen Teilen.<br /><br />
    3. 6 Monate Gewährleistung auf Reparaturleistung.<br /><br />
    4. Zugriff auf Gerät zur Fehlerprüfung möglich.<br /><br />
    5. Abholung innerhalb von 60 Tagen erforderlich.<br /><br />
    6. Mit Unterschrift werden Bedingungen akzeptiert.
  </div>
  
  <div style="margin-top: 16px; text-align: center;">
    <div style="font-weight: bold; margin-bottom: 4px;">Reparaturauftrag erteilt</div>
    {{customerSignature}}
    <div style="border-top: 1px solid #000; width: 100%; margin: 2px 0 6px;"></div>
    {{customerName}}<br />
    {{currentDate}}
  </div>
</div>
      `;
    case 'receipt_80mm':
      return `
<div style="font-family: Arial, sans-serif; font-size: 12px; width: 80mm; margin: 0; padding: 10px;">
  <div style="text-align: center; margin-bottom: 8px;">
    {{businessLogo}}
  </div>
  
  <div style="text-align: center; margin-bottom: 15px;">
    <strong style="font-size: 14px;">{{businessName}}</strong><br />
    {{businessAddress}}<br />
    {{businessPhone}}
  </div>
  
  <div style="text-align: center; margin: 15px 0;">
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">Abholschein</div>
    <div style="font-weight: bold; font-size: 14px;">{{repairId}}</div>
    <div>{{currentDate}}</div>
  </div>
  
  <div style="margin-bottom: 15px;">
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">{{customerName}}</div>
    <div style="margin-bottom: 3px;">{{customerPhone}}</div>
    <div style="margin-bottom: 3px;">{{customerEmail}}</div>
  </div>
  
  <div style="margin-bottom: 15px;">
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">
      {{deviceBrand}} {{deviceModel}}
    </div>
    
    <div style="font-weight: bold; margin-top: 8px; margin-bottom: 3px;">Schaden/Fehler</div>
    <div>{{deviceIssue}}</div>
    
    <div style="font-weight: bold; margin-top: 10px; margin-bottom: 3px;">Reparaturkosten</div>
    <div>{{preis}}</div>
  </div>
  
  <div style="border: 1px solid #000; padding: 8px; font-size: 10px; line-height: 1.4; margin-bottom: 15px;">
    <div style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 5px;">Reparaturbedingungen</div>
    1. Keine Haftung für Datenverlust – Kunde ist verantwortlich.<br /><br />
    2. Reparatur mit geprüften, ggf. nicht originalen Teilen.<br /><br />
    3. 6 Monate Gewährleistung auf Reparaturleistung.<br /><br />
    4. Zugriff auf Gerät zur Fehlerprüfung möglich.<br /><br />
    5. Abholung innerhalb von 60 Tagen erforderlich.<br /><br />
    6. Mit Unterschrift werden Bedingungen akzeptiert.
  </div>
  
  <div style="margin-top: 20px; text-align: center;">
    <div style="font-weight: bold; margin-bottom: 5px;">Reparaturauftrag erteilt</div>
    {{customerSignature}}
    <div style="border-top: 1px solid #000; width: 100%; margin: 3px 0 8px;"></div>
    {{customerName}}<br />
    {{currentDate}}
  </div>
</div>
      `;
    default:
      return '';
  }
}