import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMultiShop } from "@/hooks/use-multi-shop";
import { Building2, Users, Settings } from "lucide-react";
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

        {/* Shop-Zugriffe */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accessibleShops?.map((shopAccess) => (
            <Card key={shopAccess.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Building2 className="w-8 h-8 text-primary" />
                  <Badge variant={shopAccess.shop.isActive ? "default" : "secondary"}>
                    {shopAccess.shop.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
                <CardTitle className="text-lg">
                  {shopAccess.shop.businessName || shopAccess.shop.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Shop-ID:</span> {shopAccess.shop.id}
                  </p>
                  {shopAccess.shop.address && (
                    <p>
                      <span className="font-medium">Adresse:</span> {shopAccess.shop.address}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Zugang gewährt:</span>{" "}
                    {new Date(shopAccess.grantedAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="mt-4">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      // Hier würde die Navigation zum spezifischen Shop erfolgen
                      // Das ist noch zu implementieren
                      console.log("Navigiere zu Shop:", shopAccess.shop.id);
                    }}
                  >
                    Shop verwalten
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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