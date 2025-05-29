import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCog, Key, Save, Loader2, UserCheck, Shield, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Schemas für die Formulare
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
  newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein"),
  confirmNewPassword: z.string().min(8, "Passwortbestätigung ist erforderlich"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmNewPassword"],
});

const profileUpdateSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen lang sein"),
});

// Benutzer-Einstellungen Komponente
export function UserSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Formular für Profiländerungen
  const profileForm = useForm<z.infer<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: user?.username || "",
    },
  });
  
  // Formular für Passwortänderungen
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  
  // Aktualisierung der Profilwerte, wenn sich der Benutzer ändert
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username || "",
      });
    }
  }, [user, profileForm]);
  
  // Mutation für Profilupdates
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileUpdateSchema>) => {
      const response = await apiRequest("POST", "/api/update-profile", data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profil aktualisiert",
        description: "Ihre Profilinformationen wurden erfolgreich aktualisiert.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Beim Aktualisieren des Profils ist ein Fehler aufgetreten: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });
  
  // Mutation für Passwortänderungen
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      const response = await apiRequest("POST", "/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },
    onSuccess: () => {
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      toast({
        title: "Passwort geändert",
        description: "Ihr Passwort wurde erfolgreich geändert.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Beim Ändern des Passworts ist ein Fehler aufgetreten: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });
  
  // Profilformular absenden
  function onProfileSubmit(data: z.infer<typeof profileUpdateSchema>) {
    updateProfileMutation.mutate(data);
  }
  
  // Passwortformular absenden
  function onPasswordSubmit(data: z.infer<typeof passwordChangeSchema>) {
    changePasswordMutation.mutate(data);
  }
  
  if (!user) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-500 mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="font-medium">Nicht angemeldet</h3>
            </div>
            <p className="text-sm text-red-600">
              Bitte melden Sie sich an, um Ihre Benutzereinstellungen zu verwalten.
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
          <h1 className="text-xl md:text-2xl font-bold">Benutzereinstellungen</h1>
          <p className="text-sm text-gray-500">Verwalten Sie Ihre persönlichen Daten</p>
        </div>
      </div>

      {/* Mobile view: Select dropdown for sections */}
      <div className="block md:hidden mb-4">
        <select 
          className="w-full p-2 border rounded-md text-sm" 
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          <option value="profile">Profil</option>
          <option value="security">Sicherheit</option>
        </select>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
        {/* Desktop view: Tab list */}
        <TabsList className="mb-6 hidden md:flex">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="security">Sicherheit</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="flex items-center text-base md:text-lg font-semibold">
                <UserCog className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                Profilinformationen
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Aktualisieren Sie Ihre persönlichen Daten</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Benutzername</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Änderungen speichern
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="mt-4 md:mt-6">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="flex items-center text-base md:text-lg font-semibold">
                <Shield className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                Kontostatus
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Informationen über Ihren Kontozugriff</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Status</span>
                  <span className="font-medium flex items-center text-green-600">
                    <UserCheck className="h-4 w-4 mr-1" />
                    Aktiv
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Rolle</span>
                  <span className="font-medium">
                    {user.isSuperadmin ? "Superadmin" : user.isAdmin ? "Administrator" : "Benutzer"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Letzter Login</span>
                  <span className="font-medium">Heute, {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Shop</span>
                  <span className="font-medium">{"Shop " + (user.shopId || "-")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="flex items-center text-base md:text-lg font-semibold">
                <Key className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                Passwort ändern
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Aktualisieren Sie Ihr Passwort regelmäßig für mehr Sicherheit</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aktuelles Passwort</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Neues Passwort</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Mindestens 8 Zeichen
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passwort bestätigen</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className="flex items-center"
                    >
                      {changePasswordMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      Passwort ändern
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}