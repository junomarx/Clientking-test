import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { useLocation } from "wouter";

const msaBusinessSchema = z.object({
  businessData: z.object({
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    vatNumber: z.string().optional(),
    taxNumber: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

type MSABusinessData = z.infer<typeof msaBusinessSchema>;

export default function MSABusinessPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/multi-shop-admin/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop-admin/profile");
      return response.json();
    },
  });

  const form = useForm<MSABusinessData>({
    resolver: zodResolver(msaBusinessSchema),
    defaultValues: {
      businessData: {
        companyName: "",
        contactPerson: "",
        street: "",
        city: "",
        zipCode: "",
        country: "",
        vatNumber: "",
        taxNumber: "",
        email: "",
        phone: "",
      },
    },
  });

  React.useEffect(() => {
    if (profile?.businessData) {
      form.reset({
        businessData: {
          companyName: profile.businessData.companyName || "",
          contactPerson: profile.businessData.contactPerson || "",
          street: profile.businessData.street || "",
          city: profile.businessData.city || "",
          zipCode: profile.businessData.zipCode || "",
          country: profile.businessData.country || "",
          vatNumber: profile.businessData.vatNumber || "",
          taxNumber: profile.businessData.taxNumber || "",
          email: profile.businessData.email || "",
          phone: profile.businessData.phone || "",
        },
      });
    }
  }, [profile, form]);

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: MSABusinessData) => {
      const response = await apiRequest("PUT", "/api/multi-shop-admin/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Geschäftsdaten aktualisiert",
        description: "Ihre Geschäftsdaten wurden erfolgreich gespeichert.",
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

  const onSubmit = (data: MSABusinessData) => {
    updateBusinessMutation.mutate(data);
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
          <h1 className="text-2xl font-bold">Geschäftsdaten & Rechnungsstellung</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Firmeninformationen für die Abrechnung</p>
        </div>
      </div>

      {/* Business Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Geschäftsdaten
          </CardTitle>
          <CardDescription>
            Diese Daten werden für Rechnungsstellung und offizielle Korrespondenz verwendet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="businessData.companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmenname</FormLabel>
                      <FormControl>
                        <Input placeholder="Muster GmbH" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ansprechpartner</FormLabel>
                      <FormControl>
                        <Input placeholder="Max Mustermann" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Straße & Hausnummer</FormLabel>
                      <FormControl>
                        <Input placeholder="Musterstraße 123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PLZ</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stadt</FormLabel>
                      <FormControl>
                        <Input placeholder="Berlin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land</FormLabel>
                      <FormControl>
                        <Input placeholder="Deutschland" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>USt-IdNr.</FormLabel>
                      <FormControl>
                        <Input placeholder="DE123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.taxNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Steuernummer</FormLabel>
                      <FormControl>
                        <Input placeholder="123/456/78901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geschäfts-E-Mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="rechnung@firma.de" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessData.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geschäftstelefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+49 30 123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={updateBusinessMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateBusinessMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}