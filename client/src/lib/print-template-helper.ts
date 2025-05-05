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
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\{\{${key}\}\}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  
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
    return template.content;
  } catch (error) {
    console.error('Fehler beim Laden der Druckvorlage:', error);
    return null;
  }
}