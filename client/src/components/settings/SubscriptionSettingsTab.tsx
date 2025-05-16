import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle, AlertTriangle, ArrowUpRight, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
  trialExpiryInfo?: {
    expiresAt: string;
    remainingDays: number;
  };
}

// Schnell-Feature-Vergleich
const featureComparison = [
  { name: "Reparaturaufträge", basic: "Max. 50 pro Monat", professional: "Unbegrenzt", enterprise: "Unbegrenzt" },
  { name: "Kundenverwaltung", basic: "✓", professional: "✓", enterprise: "✓" },
  { name: "Statistiken", basic: "Einfach", professional: "Erweitert", enterprise: "Vollständig" },
  { name: "E-Mail-Benachrichtigungen", basic: "✓", professional: "✓", enterprise: "✓" },
  { name: "Druckfunktionen", basic: "Grundlegend", professional: "Erweitert", enterprise: "Premium" },
  { name: "Kostenvoranschläge", basic: "✓", professional: "✓", enterprise: "✓" },
  { name: "Support", basic: "E-Mail", professional: "E-Mail & Telefon", enterprise: "Priorität" },
  { name: "Benutzerverwaltung", basic: "1 Benutzer", professional: "5 Benutzer", enterprise: "Unbegrenzt" },
];

export function SubscriptionSettingsTab() {
  // Abrufen des Reparaturkontingents über die API
  const { data: quotaData, isLoading, error } = useQuery<RepairQuota>({
    queryKey: ["/api/repair-quota"],
    // Alle 30 Sekunden aktualisieren, wenn die Seite geöffnet ist
    refetchInterval: 30000,
  });
  
  // Ist der Benutzer auf Professional oder höher?
  const isProfessionalOrHigher = quotaData?.pricingPlan === 'professional' || quotaData?.pricingPlan === 'enterprise';
  
  // Prozentsatz der verbrauchten Kontingent berechnen
  const usagePercentage = quotaData 
    ? Math.min(100, Math.round((quotaData.count / quotaData.limit) * 100)) 
    : 0;
  
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Aktuelle Abo-Karte */}
        <div className="md:col-span-2">
          <Card className={`overflow-hidden border-2 ${
            quotaData.pricingPlan === 'basic' ? 'border-gray-300' : 
            quotaData.pricingPlan === 'professional' ? 'border-green-300' : 
            'border-blue-300'
          }`}>
            <div className={`py-1.5 px-4 text-sm text-white ${
              quotaData.pricingPlan === 'basic' ? 'bg-gray-500' : 
              quotaData.pricingPlan === 'professional' ? 'bg-green-500' : 
              'bg-blue-500'
            }`}>
              Aktives Abonnement
            </div>
            <CardHeader className="pt-4 p-4 md:p-6">
              <CardTitle className="flex items-center">
                <Package className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                <span className="text-lg md:text-xl">{quotaData.displayName}</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {quotaData.displayName === 'Demo' && quotaData.trialExpiryInfo ? (
                  <>
                    <span className="block font-medium text-amber-600">
                      Demo-Version: Noch {quotaData.trialExpiryInfo.remainingDays} Tage verfügbar
                    </span>
                    <span className="block mt-1">
                      Läuft ab am: {new Date(quotaData.trialExpiryInfo.expiresAt).toLocaleDateString('de-DE')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block">Abrechnungszeitraum: {quotaData.currentMonth} {quotaData.currentYear}</span>
                    <span className="block mt-1">Nächste Abrechnung: 01.{quotaData.currentMonth === 'Dezember' ? 'Januar' : 'Juni'} {quotaData.currentMonth === 'Dezember' ? quotaData.currentYear + 1 : quotaData.currentYear}</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                {/* Status-Anzeige */}
                <div className="flex items-center justify-between p-2 md:p-3 bg-green-50 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-1 md:mr-2" />
                    <span className="font-medium text-sm md:text-base">Aktiv</span>
                  </div>
                  <Button variant="link" size="sm" className="text-green-600 p-0 h-auto text-xs md:text-sm" asChild>
                    <a href="mailto:support@handyshop-verwaltung.at">
                      Support <span className="hidden md:inline">kontaktieren</span> <ArrowUpRight className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
                
                {/* Demo-Paket Ablaufwarnung */}
                {quotaData.displayName === 'Demo' && quotaData.trialExpiryInfo && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                      Demo-Version läuft in {quotaData.trialExpiryInfo.remainingDays} Tagen ab
                    </h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Um Ihre Daten zu behalten und den Service weiterhin zu nutzen, upgraden Sie bitte auf ein kostenpflichtiges Paket vor dem {new Date(quotaData.trialExpiryInfo.expiresAt).toLocaleDateString('de-DE')}.
                    </p>
                  </div>
                )}

                {/* Wenn Basic Plan, dann Kontingent anzeigen */}
                {quotaData.pricingPlan === 'basic' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Verbleibende Reparaturaufträge</span>
                      <span>
                        {`${quotaData.limit - quotaData.count} von ${quotaData.limit}`}
                      </span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                    
                    {quotaData.count >= quotaData.limit && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                        <strong>Monatliches Limit erreicht.</strong> Upgrade auf Professional für unbegrenzte Aufträge.
                      </div>
                    )}
                  </div>
                )}

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
        </div>

        {/* Hinweiskarte je nach Abo */}
        <div>
          <Card className={`h-full ${
            quotaData.pricingPlan === 'basic' ? 'bg-gray-50' : 
            quotaData.pricingPlan === 'professional' ? 'bg-green-50' : 
            'bg-blue-50'
          }`}>
            <CardHeader>
              <CardTitle className="text-lg">{
                quotaData.pricingPlan === 'basic' ? 'Upgrade auf Professional' : 
                quotaData.pricingPlan === 'professional' ? 'Ihr Professional-Plan' : 
                'Ihr Enterprise-Plan'
              }</CardTitle>
            </CardHeader>
            <CardContent>
              {quotaData.pricingPlan === 'basic' ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    Erweitern Sie Ihre Möglichkeiten mit unserem Professional-Plan und profitieren Sie von:
                  </p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Unbegrenzten Reparaturaufträgen</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Erweiterten Statistiken für bessere Einblicke</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Zugang zu 5 Benutzerkonten</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-4">
                    Jetzt upgraden
                  </Button>
                </div>
              ) : quotaData.pricingPlan === 'professional' ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    Mit Ihrem Professional-Plan genießen Sie:
                  </p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Unbegrenzte Reparaturaufträge</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Erweiterte Statistiken</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span>Telefon-Support bei Fragen</span>
                    </li>
                  </ul>
                  <div className="p-3 bg-green-100 rounded-md mt-4 text-sm">
                    <p>
                      Sie möchten mehr? Informieren Sie sich über unseren Enterprise-Plan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">
                    Als Enterprise-Kunde genießen Sie alle Vorteile:
                  </p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                      <span>Unbegrenzte Reparaturaufträge</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                      <span>Vollständige Statistiken</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                      <span>Prioritätssupport</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                      <span>Unbegrenzte Benutzerkonten</span>
                    </li>
                  </ul>
                  <div className="p-3 bg-blue-100 rounded-md mt-4 text-sm">
                    <p>
                      Sie haben Fragen? Kontaktieren Sie unseren Premiumsupport.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Funktionsvergleich */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Funktionen im Vergleich</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Funktion</th>
                    <th className="text-center py-3 px-4 font-medium">Basic</th>
                    <th className="text-center py-3 px-4 font-medium">Professional</th>
                    <th className="text-center py-3 px-4 font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((feature, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-muted/10' : ''}>
                      <td className="py-3 px-4 text-sm font-medium">{feature.name}</td>
                      <td className="py-3 px-4 text-center text-sm">{feature.basic}</td>
                      <td className={`py-3 px-4 text-center text-sm ${quotaData.pricingPlan === 'professional' ? 'font-semibold' : ''}`}>
                        {feature.professional}
                      </td>
                      <td className={`py-3 px-4 text-center text-sm ${quotaData.pricingPlan === 'enterprise' ? 'font-semibold' : ''}`}>
                        {feature.enterprise}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}