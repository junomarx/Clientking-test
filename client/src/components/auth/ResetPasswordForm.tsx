import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Link } from "wouter";

// Schema für die Passwort-Zurücksetzung
const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
    confirmPassword: z.string().min(1, "Passwort-Bestätigung ist erforderlich"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [resetSuccess, setResetSuccess] = React.useState(false);

  // Validate token when component mounts
  const { data: tokenValidation, isLoading: isValidating, error: validationError } = useQuery({
    queryKey: ['validatePasswordResetToken', token],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/auth/password-reset/validate?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error('Token validation failed');
      }
      return await response.json();
    },
    retry: false,
    refetchOnWindowFocus: false
  });

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/password-reset/confirm", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Zurücksetzen des Passworts");
      }
      return await response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
      form.reset();
      
      // Automatisch nach 3 Sekunden zur Anmeldeseite weiterleiten
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ResetPasswordFormValues) {
    mutation.mutate({
      token,
      newPassword: data.newPassword,
    });
  }

  // Show loading state during token validation
  if (isValidating) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Token wird überprüft...
          </CardTitle>
          <CardDescription>
            Bitte warten Sie, während wir Ihren Reset-Link überprüfen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Show error for invalid token
  if (validationError || (tokenValidation && !tokenValidation.valid)) {
    const errorMessage = tokenValidation?.message || "Ungültiger oder abgelaufener Reset-Link";
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
            Reset-Link ungültig
          </CardTitle>
          <CardDescription>
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/forgot-password">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Neuen Link anfordern
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show expiry warning if token is expiring soon
  const showExpiryWarning = tokenValidation?.expiresAt && new Date(tokenValidation.expiresAt).getTime() - Date.now() < 5 * 60 * 1000; // 5 minutes

  if (resetSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
            Passwort erfolgreich zurückgesetzt
          </CardTitle>
          <CardDescription>
            Ihr Passwort wurde erfolgreich zurückgesetzt. Sie werden in wenigen Sekunden zur Anmeldeseite
            weitergeleitet.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zur Anmeldeseite
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Neues Passwort festlegen</CardTitle>
        <CardDescription>
          Bitte geben Sie ein neues Passwort ein, um Ihr Konto wieder zu aktivieren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showExpiryWarning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Dieser Link läuft in wenigen Minuten ab. Bitte setzen Sie Ihr Passwort jetzt zurück.
              </span>
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neues Passwort</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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
                  <FormLabel>Passwort bestätigen</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird zurückgesetzt...
                </>
              ) : (
                "Passwort zurücksetzen"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" asChild>
          <Link href="/auth">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Anmeldung
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}