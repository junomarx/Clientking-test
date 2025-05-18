import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Diese Komponente dient nur zur Fehlerbehebung
 * Sie zeigt im Browserkonsole die Antwort von /api/cost-estimates
 */
export function DebugCostEstimates() {
  const { data: costEstimates } = useQuery({
    queryKey: ['/api/cost-estimates'],
    staleTime: 10000,
  });

  useEffect(() => {
    if (costEstimates) {
      console.log('DEBUG: Cost Estimates Daten:', costEstimates);
      
      // Alle Kundendaten prüfen
      costEstimates.forEach((estimate, index) => {
        console.log(`Eintrag #${index + 1} (${estimate.reference_number}):`);
        console.log(' - firstName:', estimate.firstName || 'FEHLT');
        console.log(' - lastName:', estimate.lastName || 'FEHLT');
        console.log(' - email:', estimate.email || 'FEHLT');
        console.log(' - customer_id:', estimate.customer_id || estimate.customerId || 'FEHLT');
        console.log(' - Felder:', Object.keys(estimate).join(', '));
      });
    }
  }, [costEstimates]);

  return null; // Keine Anzeige, nur für Debug-Zwecke
}