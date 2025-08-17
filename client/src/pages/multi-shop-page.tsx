import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMultiShop } from "@/hooks/use-multi-shop";
import { Building2, Users, Settings, BarChart3, TrendingUp, Activity, Calendar } from "lucide-react";
import { Redirect } from "wouter";

/**
 * Multi-Shop Dashboard für Multi-Shop Admins
 * Zeigt alle zugänglichen Shops und ermöglicht Navigation zwischen ihnen
 */
export default function MultiShopPage() {
  console.log('🔥🔥🔥 MultiShopPage wird gerendert!');
  
  const { user, logoutMutation } = useAuth();
  const { accessibleShops, isLoadingShops, shopsError } = useMultiShop();

  console.log('🔥 MultiShopPage vollständiger State:', { 
    user, 
    userIsMultiShopAdmin: user?.isMultiShopAdmin,
    userIsSuperadmin: user?.isSuperadmin,
    accessibleShops, 
    isLoadingShops, 
    shopsError 
  });

  // NOTFALL-DEBUG: Zeige immer die Seite an, egal was
  console.log('🔥 NOTFALL-DEBUG: Zeige IMMER Multi-Shop Seite');
  console.log('🔥 User Daten:', { 
    user: user?.username, 
    isMultiShopAdmin: user?.isMultiShopAdmin,
    isSuperadmin: user?.isSuperadmin,
    shopId: user?.shopId 
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoadingShops) {
    console.log('🔥 Zeige Loading-State für Shop-Daten');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Lade Shop-Daten...</p>
          <button 
            onClick={() => logoutMutation.mutate()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Notfall-Logout
          </button>
        </div>
      </div>
    );
  }

  // UMFASSENDE DEBUG-LOGS für Multi-Shop Page
  console.log('🐛 MULTI-SHOP PAGE DEBUG START');
  console.log('🐛 user:', user);
  console.log('🐛 user.isMultiShopAdmin:', user?.isMultiShopAdmin);
  console.log('🐛 accessibleShops:', accessibleShops);
  console.log('🐛 isLoadingShops:', isLoadingShops);
  console.log('🐛 shopsError:', shopsError);
  console.log('🐛 MULTI-SHOP PAGE DEBUG END');
  
  // Fehlerbehandlung 
  if (shopsError) {
    console.error('Multi-Shop Page Error:', shopsError);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Multi-Shop Verwaltung</h1>
              <p className="text-gray-600 mt-2">
                Willkommen zurück, <span className="font-semibold">{user.username}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleLogout}>
                Abmelden
              </Button>
            </div>
          </div>
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Fehler beim Laden</h3>
              <p className="text-gray-600 mb-6">
                Fehler: {shopsError.message}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Seite neu laden
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Fallback für leere Daten (ohne Fehler)
  if (!isLoadingShops && (!accessibleShops || accessibleShops.length === 0)) {
    console.warn('Multi-Shop Page: Keine Shop-Daten verfügbar (aber kein Fehler)');
  }

  console.log('🔥 Rendere Multi-Shop Hauptcontent!');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multi-Shop Verwaltung</h1>
            <p className="text-gray-600 mt-2">
              Willkommen zurück, <span className="font-semibold">{user.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Users className="w-4 h-4 mr-2" />
              Multi-Shop Admin
            </Badge>
            <Button variant="outline" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
        </div>

        {/* Übersichts-Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verwaltete Shops</p>
                  <p className="text-2xl font-bold">{accessibleShops?.length || 0}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktive Shops</p>
                  <p className="text-2xl font-bold">
                    {accessibleShops?.length || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gesamt-Performance</p>
                  <p className="text-2xl font-bold text-green-600">+12%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Letztes Update</p>
                  <p className="text-sm font-medium">{new Date().toLocaleDateString("de-DE")}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shop-Zugriffe */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Ihre verwalteten Shops</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accessibleShops?.map((shopAccess) => (
              <Card key={shopAccess.id} className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Building2 className="w-8 h-8 text-primary" />
                    <Badge variant="default">
                      Aktiv
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {shopAccess.businessName || shopAccess.name || `Shop ${shopAccess.shopId}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Shop-Metriken Anzeige */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {shopAccess.metrics?.totalRepairs || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Reparaturen</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        €{shopAccess.metrics?.totalRevenue || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Gesamtumsatz</div>
                    </div>
                  </div>
                  
                  {/* Zusätzliche Metriken */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-blue-600 text-sm">{shopAccess.metrics?.activeRepairs || 0}</div>
                      <div className="text-xs text-muted-foreground">Aktive</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-purple-600 text-sm">{shopAccess.metrics?.totalEmployees || 0}</div>
                      <div className="text-xs text-muted-foreground">Mitarbeiter</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-yellow-600 text-sm">€{shopAccess.metrics?.monthlyRevenue || 0}</div>
                      <div className="text-xs text-muted-foreground">30T Umsatz</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Shop-ID:</span>
                      <span className="text-right">{shopAccess.shopId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Zugang gewährt:</span>
                      <span className="text-right">{new Date(shopAccess.grantedAt).toLocaleDateString("de-DE")}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      size="sm"
                      onClick={() => {
                        // Navigation zum Dashboard des spezifischen Shops
                        console.log("🔍 Multi-Shop Admin: Navigiere zu Shop Dashboard:", shopAccess.shopId);
                        alert(`Dashboard für Shop ${shopAccess.shopId} wird implementiert`);
                      }}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Dashboard
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Mitarbeiter-Verwaltung mit Transfer-Option
                        console.log("👥 Multi-Shop Admin: Mitarbeiter-Verwaltung für Shop:", shopAccess.shopId);
                        alert(`Mitarbeiter-Transfer für Shop ${shopAccess.shopId} wird implementiert`);
                      }}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Gesamtstatistiken */}
        {accessibleShops && accessibleShops.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>🌐 Gesamtübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {accessibleShops.reduce((sum, shop) => sum + (shop.metrics?.totalRepairs || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Gesamte Reparaturen</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    €{accessibleShops.reduce((sum, shop) => sum + (shop.metrics?.totalRevenue || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Gesamtumsatz</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {accessibleShops.reduce((sum, shop) => sum + (shop.metrics?.totalEmployees || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Gesamte Mitarbeiter</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    €{accessibleShops.reduce((sum, shop) => sum + (shop.metrics?.monthlyRevenue || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">30-Tage Gesamtumsatz</div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">🔄 Multi-Shop Features</h4>
                <div className="text-sm text-gray-600">
                  <p>• Mitarbeiter zwischen Shops transferieren</p>
                  <p>• Gesamtstatistiken einsehen (DSGVO-konform)</p>
                  <p>• Cross-Shop Performance Vergleich</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kein Zugang zu Shops */}
        {accessibleShops?.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Keine Shop-Zugänge</h3>
              <p className="text-gray-600 mb-6">
                Sie haben derzeit keinen Zugang zu Shops. Wenden Sie sich an einen Superadministrator,
                um Zugang zu erhalten.
              </p>
              <Button variant="outline" onClick={handleLogout}>
                Abmelden
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p className="text-sm">
            Multi-Shop Verwaltungssystem • Handyshop Verwaltung
          </p>
        </div>
      </div>
    </div>
  );
}