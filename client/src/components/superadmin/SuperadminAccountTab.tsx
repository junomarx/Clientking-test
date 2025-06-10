import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ShieldCheck, 
  KeyRound, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// Schema für Passwort-Änderung
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
  newPassword: z.string().min(6, "Neues Passwort muss mindestens 6 Zeichen haben"),
  confirmPassword: z.string().min(6, "Passwort-Bestätigung ist erforderlich"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function SuperadminAccountTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Passwort-Änderung Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      const response = await apiRequest("POST", "/api/superadmin/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Passwort geändert",
        description: "Ihr Superadmin-Passwort wurde erfolgreich geändert.",
      });
      form.reset();
      setIsChangingPassword(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Fehler beim Ändern des Passworts",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten.",
      });
    },
  });

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Konto-Einstellungen</h1>
          <p className="text-sm md:text-base text-muted-foreground">Verwalten Sie Ihre Superadmin-Konto-Einstellungen</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Benutzerinformationen werden geladen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Konto-Einstellungen</h1>
        <p className="text-sm md:text-base text-muted-foreground">Verwalten Sie Ihre Superadmin-Konto-Einstellungen</p>
      </div>

      {/* Konto-Informationen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Superadmin-Konto
          </CardTitle>
          <CardDescription>
            Ihre grundlegenden Konto-Informationen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Benutzername</Label>
              <p className="text-lg font-semibold">{user.username}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">E-Mail-Adresse</Label>
              <p className="text-lg">{user.email || 'Nicht festgelegt'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Benutzer-ID</Label>
              <p className="text-lg font-mono">{user.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Rolle</Label>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="text-lg font-semibold text-blue-600">Superadministrator</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Superadmin-Schutz aktiv</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Ihr Superadmin-Konto ist vor versehentlicher Löschung geschützt und kann nicht von anderen Administratoren deaktiviert werden.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passwort-Änderung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-orange-600" />
            Passwort ändern
          </CardTitle>
          <CardDescription>
            Ändern Sie Ihr Superadmin-Passwort für erhöhte Sicherheit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isChangingPassword ? (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">Sicherheitshinweis</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Verwenden Sie ein starkes Passwort mit mindestens 6 Zeichen. Nach der Änderung müssen Sie sich erneut anmelden.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => setIsChangingPassword(true)}
                className="w-full md:w-auto"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Passwort ändern
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aktuelles Passwort</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Geben Sie Ihr aktuelles Passwort ein"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Neues Passwort</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Geben Sie Ihr neues Passwort ein"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Neues Passwort bestätigen</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Bestätigen Sie Ihr neues Passwort"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    {changePasswordMutation.isPending ? "Wird geändert..." : "Passwort ändern"}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      form.reset();
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Sicherheitshinweise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Sicherheitshinweise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-medium text-amber-700 dark:text-amber-400">•</span>
              <span>Ihr Superadmin-Konto kann nicht gelöscht oder deaktiviert werden.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-amber-700 dark:text-amber-400">•</span>
              <span>Ändern Sie Ihr Passwort regelmäßig für maximale Sicherheit.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-amber-700 dark:text-amber-400">•</span>
              <span>Teilen Sie Ihre Superadmin-Anmeldedaten niemals mit anderen Personen.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-amber-700 dark:text-amber-400">•</span>
              <span>Melden Sie sich immer ab, wenn Sie einen geteilten Computer verwenden.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}