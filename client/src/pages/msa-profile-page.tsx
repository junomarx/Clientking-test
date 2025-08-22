import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Save } from "lucide-react";
import { useLocation } from "wouter";

const msaProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Gültige E-Mail erforderlich").optional(),
  phone: z.string().optional(),
});

type MSAProfileData = z.infer<typeof msaProfileSchema>;

export default function MSAProfilePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/multi-shop-admin/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop-admin/profile");
      return response.json();
    },
  });

  const form = useForm<MSAProfileData>({
    resolver: zodResolver(msaProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  React.useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: MSAProfileData) => {
      const response = await apiRequest("PUT", "/api/multi-shop-admin/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil aktualisiert",
        description: "Ihre Profildaten wurden erfolgreich gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop-admin/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Beim Speichern ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MSAProfileData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/multi-shop-admin")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profil & Stammdaten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre persönlichen Daten</p>
        </div>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Persönliche Daten
          </CardTitle>
          <CardDescription>
            Ihre grundlegenden Kontaktinformationen für Multi-Shop Administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname</FormLabel>
                      <FormControl>
                        <Input placeholder="Max" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachname</FormLabel>
                      <FormControl>
                        <Input placeholder="Mustermann" {...field} />
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
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="max@beispiel.de" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+49 123 456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}