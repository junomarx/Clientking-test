import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserCog, Shield, Loader2 } from "lucide-react";

// Validierungsschemas (Profile-Updates entfernt, da Benutzername nicht mehr änderbar ist)

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
  newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen haben"),
  confirmNewPassword: z.string().min(1, "Passwort-Bestätigung ist erforderlich"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmNewPassword"],
});

// Benutzer-Einstellungen Komponente
export function UserSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Formular für Passwort-Änderungen
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  
  // Mutation für Passwort-Änderungen
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      const response = await apiRequest("POST", "/api/change-password", data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Passwort geändert",
        description: "Ihr Passwort wurde erfolgreich aktualisiert.",
        variant: "default",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Ändern des Passworts",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });
  
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

      <div className="space-y-6">
        {/* Profilinformationen */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center text-base md:text-lg font-semibold">
              <UserCog className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
              Profilinformationen
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Ihre unveränderlichen Kontoinformationen</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Benutzername</label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                    {user.username}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Der Benutzername kann aus Sicherheitsgründen nicht geändert werden.
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Aktiv</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rolle:</span>
                    <span className="font-medium">
                      {user.isSuperadmin ? "Superadmin" : user.isAdmin ? "Administrator" : "Benutzer"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shop-ID:</span>
                    <span className="font-medium">{user.shopId || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Benutzer-ID:</span>
                    <span className="font-medium">{user.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passwort ändern */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center text-base md:text-lg font-semibold">
              <Shield className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
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
                        <FormDescription className="text-xs">
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
                    className="min-w-[140px]"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <Shield className="h-4 w-4 mr-2" />
                        Ändern...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Passwort ändern
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}