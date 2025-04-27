import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useAuth } from "@/hooks/use-auth";
import { User, Edit, Save, Loader2, AlertCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";

const userProfileSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen lang sein"),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein")
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;

export function UserSettingsTab() {
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || ""
    }
  });

  // Initialisiere das Formular mit den Benutzerdaten, wenn sie verfügbar sind
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Profil konnte nicht aktualisiert werden.");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg!",
        description: "Ihre Profildaten wurden erfolgreich aktualisiert.",
        duration: 3000,
      });
      
      // Aktualisiere den Benutzer im Auth-Kontext
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditMode(false);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  function onSubmit(data: UserProfileFormValues) {
    setError(null);
    updateProfileMutation.mutate(data);
  }

  function toggleEditMode() {
    if (isEditMode && form.formState.isDirty) {
      // Wenn wir den Bearbeitungsmodus verlassen und Änderungen vorgenommen wurden,
      // setzen wir das Formular zurück
      form.reset({
        username: user?.username || "",
        email: user?.email || ""
      });
    }
    setIsEditMode(!isEditMode);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <User className="h-5 w-5" />
            Benutzerprofil
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre persönlichen Benutzereinstellungen und Sicherheitsoptionen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isEditMode ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benutzername</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Benutzername" 
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail-Adresse</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="E-Mail" 
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2 mt-4">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    size="sm"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird gespeichert...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Speichern
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={toggleEditMode}
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              {/* Benutzerinformationen (Anzeigemodus) */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Benutzername</h3>
                    <p className="mt-1">{user?.username}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">E-Mail-Adresse</h3>
                    <p className="mt-1">{user?.email}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleEditMode}
                  className="mt-2"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </div>
            </>
          )}

          {/* Sicherheitsoptionen */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-base font-medium">Sicherheit</h3>
            <Button 
              variant="outline" 
              onClick={() => setIsChangePasswordDialogOpen(true)}
            >
              Passwort ändern
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog 
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />
    </div>
  );
}