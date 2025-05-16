import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useLocation } from 'wouter';

/**
 * Komponente zur Anzeige einer Warnung, wenn Geschäftsdaten unvollständig sind
 */
export function BusinessDataAlert() {
  const [missingData, setMissingData] = useState(false);
  const { settings, isLoading } = useBusinessSettings();
  const [, navigate] = useLocation();

  // Prüft, ob notwendige Geschäftsdaten vorhanden sind
  useEffect(() => {
    if (!isLoading && settings) {
      // Prüfe auf fehlende Pflichtfelder
      const requiredFields = [
        settings.businessName,
        settings.streetAddress,
        settings.city,
        settings.zipCode,
        settings.phone,
        settings.taxId || settings.vatNumber // entweder Steuer-ID oder USt-IdNr. sollte vorhanden sein
      ];
      
      const hasMissingData = requiredFields.some(field => !field || field.trim() === '');
      setMissingData(hasMissingData);
    }
  }, [isLoading, settings]);

  // Wenn keine Daten fehlen oder noch geladen wird, nichts anzeigen
  if (!missingData || isLoading) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Unvollständige Geschäftsdaten</AlertTitle>
      <AlertDescription className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
        <span>
          Ihre Geschäftsdaten sind unvollständig. Bitte vervollständigen Sie Ihre Daten, um alle Funktionen nutzen zu können.
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white hover:bg-gray-100 whitespace-nowrap"
          onClick={() => navigate('/app/settings/business')}
        >
          Zu den Geschäftseinstellungen
        </Button>
      </AlertDescription>
    </Alert>
  );
}