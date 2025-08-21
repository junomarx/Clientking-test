import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

export default function MultiShopAdminManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  
  // Lade gewährte Zugänge
  const { data: grantedAccesses, isLoading, error } = useQuery({
    queryKey: ['/api/multi-shop/granted-accesses'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/multi-shop/granted-accesses');
      if (!response.ok) {
        throw new Error('Failed to load granted accesses');
      }
      return response.json();
    }
  });

  // Mutation für das Gewähren von Zugriff
  const grantAccessMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await apiRequest('POST', '/api/multi-shop/grant-access', {
        email: emailAddress
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to grant access');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Zugriff gewährt",
        description: `Multi-Shop-Admin ${email} hat jetzt Zugriff auf Ihren Shop.`,
      });
      setEmail("");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/granted-accesses'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Gewähren des Zugriffs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGrantAccess = () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "Ungültige E-Mail",
        description: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        variant: "destructive",
      });
      return;
    }
    
    grantAccessMutation.mutate(email);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600">Lade Multi-Shop-Admin Verwaltung...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/multi-shop/granted-accesses'] })}>
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multi-Shop-Admin Verwaltung</h2>
          <p className="text-gray-600 mt-1">
            Gewähren Sie Multi-Shop-Admins Zugriff auf Ihren Shop
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4 mr-2" />
              Multishop-Admin zuweisen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Multi-Shop-Admin zuweisen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse des Multi-Shop-Admins</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !grantAccessMutation.isPending) {
                      handleGrantAccess();
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  Geben Sie die E-Mail-Adresse des Multi-Shop-Admins ein, dem Sie Zugriff gewähren möchten.
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEmail("");
                  }}
                  disabled={grantAccessMutation.isPending}
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleGrantAccess}
                  disabled={grantAccessMutation.isPending || !email}
                >
                  {grantAccessMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Gewähre Zugriff...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Zugriff gewähren
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bestätigung nach erfolgreichem Gewähren */}
      {grantedAccesses && grantedAccesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Zugriff gewährt für Multishop Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grantedAccesses.map((access: any) => (
                <div 
                  key={access.id} 
                  className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {access.multiShopAdminEmail || access.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        Multi-Shop-Admin
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Zugriff gewährt
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(access.grantedAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hinweis, wenn noch keine Zugänge gewährt wurden */}
      {(!grantedAccesses || grantedAccesses.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Noch keine Multi-Shop-Admins</h3>
            <p className="text-gray-600 mb-6">
              Sie haben noch keinem Multi-Shop-Admin Zugriff auf Ihren Shop gewährt.
              Klicken Sie auf "Multishop-Admin zuweisen", um zu beginnen.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ersten Multi-Shop-Admin zuweisen
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Informationsbereich */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Was ist ein Multi-Shop-Admin?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Multi-Shop-Admins können auf mehrere Shops zugreifen und diese verwalten.
              Wenn Sie einem Multi-Shop-Admin Zugriff gewähren:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Kann der Admin Ihre Shop-Daten einsehen (DSGVO-konform)</li>
              <li>Kann Reparaturen und Bestellungen verwalten</li>
              <li>Kann Statistiken und Reports generieren</li>
              <li>Kann bei der Mitarbeiterverwaltung unterstützen</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Der Zugriff kann jederzeit wieder entzogen werden.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}