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
  const { user, logoutMutation } = useAuth();
  const { accessibleShops, isLoadingShops } = useMultiShop();

  // Nur Multi-Shop Admins haben Zugang zu dieser Seite
  if (!user || !user.isMultiShopAdmin || user.isSuperadmin) {
    return <Redirect to="/" />;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoadingShops) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
                    {accessibleShops?.filter(shop => shop.isActive).length || 0}
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
                    <Badge variant={shopAccess.isActive ? "default" : "secondary"}>
                      {shopAccess.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {shopAccess.businessName || shopAccess.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Shop-ID:</span>
                      <span className="text-right">{shopAccess.shopId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Zugang gewährt:</span>
                      <span className="text-right">{new Date(shopAccess.grantedAt).toLocaleDateString("de-DE")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant="outline" className="text-xs">
                        Vollzugriff
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      size="sm"
                      onClick={() => {
                        // Navigation zum Dashboard des spezifischen Shops
                        console.log("Navigiere zu Shop Dashboard:", shopAccess.shopId);
                      }}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Dashboard
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Navigation zu Shop-Einstellungen
                        console.log("Navigiere zu Shop Settings:", shopAccess.shopId);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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