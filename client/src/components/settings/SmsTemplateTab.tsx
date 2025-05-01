import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

/**
 * Komponente für den SMS-Template Tab
 * Zeigt an, dass die SMS-Funktionalität entfernt wurde
 */
export function SmsTemplateTab() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">SMS-Funktionalität wurde entfernt</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Die SMS-Funktionalität ist nicht mehr verfügbar. Bitte verwenden Sie E-Mail-Vorlagen
          für die Kundenkommunikation.
        </p>
      </CardContent>
    </Card>
  );
}