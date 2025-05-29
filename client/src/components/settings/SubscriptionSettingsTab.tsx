import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle, AlertTriangle, ArrowUpRight, Loader2, Infinity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Typ-Definition für die API-Antwort des Reparaturkontingents
interface RepairQuota {
  canCreate: boolean;
  count: number; // Aktuell benutzte Reparaturaufträge
  limit: number;
  pricingPlan: string;
  displayName: string;
  currentMonth: string;
  currentYear: number;
}

// Alle verfügbaren Features im Basic-Paket
const basicFeatures = [
  "Unbegrenzte Reparaturaufträge",
  "Vollständige Kundenverwaltung",
  "Erweiterte Statistiken und Berichte",
  "E-Mail-Benachrichtigungen",
  "PDF-Generierung und Druckfunktionen", 
  "Kostenvoranschläge erstellen",
  "Digitale Signaturen",
  "Bewertungsmanagement",
  "Geräteverwaltung",
  "E-Mail-Support"
];

export function SubscriptionSettingsTab() {
  // Abrufen des Reparaturkontingents über die API
  const { data: quotaData, isLoading, error } = useQuery<RepairQuota>({
    queryKey: ["/api/repair-quota"],
    refetchInterval: 30000,
  });
  
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Lade Abonnementdaten...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !quotaData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-500 mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="font-medium">Fehler beim Laden der Abonnementdaten</h3>
            </div>
            <p className="text-sm text-red-600">
              Die Informationen zu Ihrem Abonnement konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Mein Abonnement</h1>
          <p className="text-sm text-gray-500">Informationen zu Ihrem aktuellen Plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aktuelle Abo-Karte */}
        <Card className="overflow-hidden border-2 border-green-300">
          <div className="py-1.5 px-4 text-sm text-white bg-green-500">
            Aktives Abonnement
          </div>
          <CardHeader className="pt-4">
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              <span className="text-xl">{quotaData.displayName}</span>
            </CardTitle>
            <CardDescription className="text-sm">
              <span className="block">Abrechnungszeitraum: {quotaData.currentMonth} {quotaData.currentYear}</span>
              <span className="block mt-1">Vollzugriff auf alle Funktionen</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status-Anzeige */}
              <div className="flex items-center p-3 bg-green-50 rounded-md">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">Aktiv</span>
              </div>

              {/* Unbegrenzte Reparaturaufträge */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                <div className="flex items-center">
                  <Infinity className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">Unbegrenzte Reparaturaufträge</span>
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {quotaData.count} erstellt
                </span>
              </div>

              <Separator />

              {/* Abonnement verwalten */}
              <div className="flex justify-end pt-2">
                <Button>
                  Abonnement verwalten
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature-Übersicht */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Ihre verfügbaren Funktionen</CardTitle>
            <CardDescription>
              Vollzugriff auf alle Premium-Features der Handyshop-Verwaltung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {basicFeatures.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-green-100 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Keine Limitierungen!</strong> Nutzen Sie alle Funktionen ohne Einschränkungen für optimale Geschäftsabläufe.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}