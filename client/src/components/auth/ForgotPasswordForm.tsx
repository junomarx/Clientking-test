import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// Schema für Passwort vergessen
const forgotPasswordSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/auth/password-reset/request", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler bei der Anfrage zur Passwort-Zurücksetzung");
      }
      return await response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ForgotPasswordFormValues) {
    mutation.mutate({ email: data.email });
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>E-Mail gesendet</CardTitle>
          <CardDescription>
            Wenn ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie in Kürze eine E-Mail mit
            Anweisungen zum Zurücksetzen Ihres Passworts.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Anmeldung
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Passwort zurücksetzen</CardTitle>
        <CardDescription>
          Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen des Passworts zu erhalten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail-Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="name@beispiel.de" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                "Zurücksetzen-Link senden"
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