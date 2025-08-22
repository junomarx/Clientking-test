import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Euro, Save, Percent } from "lucide-react";
import { useLocation } from "wouter";

const msaPricingSchema = z.object({
  pricePerShop: z.number().min(0, "Preis muss positiv sein"),
  currency: z.string().default("EUR"),
  billingCycle: z.string().default("monthly"),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

type MSAPricingData = z.infer<typeof msaPricingSchema>;

export default function MSAPricingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/multi-shop-admin/profile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop-admin/profile");
      return response.json();
    },
  });

  const form = useForm<MSAPricingData>({
    resolver: zodResolver(msaPricingSchema),
    defaultValues: {
      pricePerShop: 50,
      currency: "EUR",
      billingCycle: "monthly",
      discountPercent: 0,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (profile?.pricing) {
      form.reset({
        pricePerShop: profile.pricing.pricePerShop || 50,
        currency: profile.pricing.currency || "EUR",
        billingCycle: profile.pricing.billingCycle || "monthly",
        discountPercent: profile.pricing.discountPercent || 0,
        notes: profile.pricing.notes || "",
      });
    }
  }, [profile, form]);

  const updatePricingMutation = useMutation({
    mutationFn: async (data: MSAPricingData) => {
      const response = await apiRequest("PUT", "/api/multi-shop-admin/pricing", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preisgestaltung aktualisiert",
        description: "Die Preiseinstellungen wurden erfolgreich gespeichert.",
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

  const onSubmit = (data: MSAPricingData) => {
    updatePricingMutation.mutate(data);
  };

  const watchedValues = form.watch();
  const totalShops = profile?.totalShops || 0;
  const baseTotal = watchedValues.pricePerShop * totalShops;
  const discountAmount = baseTotal * (watchedValues.discountPercent / 100);
  const finalTotal = baseTotal - discountAmount;

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
          <h1 className="text-2xl font-bold">Preisgestaltung & Pakete</h1>
          <p className="text-muted-foreground">Verwalten Sie die Abrechnung für Multi-Shop Administration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Preiseinstellungen
              </CardTitle>
              <CardDescription>
                Konfigurieren Sie die Abrechnung für verwaltete Shops
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="pricePerShop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preis pro Shop</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              placeholder="50.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="discountPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Rabatt (%)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="1"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bemerkungen</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Zusätzliche Informationen zur Preisgestaltung..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-6">
                    <Button 
                      type="submit" 
                      disabled={updatePricingMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updatePricingMutation.isPending ? "Speichern..." : "Speichern"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Abrechnung Vorschau</CardTitle>
              <CardDescription>
                Aktuelle Kostenübersicht
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Verwaltete Shops:</span>
                <span className="font-medium">{totalShops}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Preis pro Shop:</span>
                <span className="font-medium">€{watchedValues.pricePerShop.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Zwischensumme:</span>
                <span className="font-medium">€{baseTotal.toFixed(2)}</span>
              </div>
              
              {watchedValues.discountPercent > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Rabatt ({watchedValues.discountPercent}%):</span>
                  <span className="font-medium text-green-600">-€{discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <hr />
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Monatlicher Gesamtbetrag:</span>
                <span className="font-bold text-lg">€{finalTotal.toFixed(2)}</span>
              </div>
              
              <div className="text-xs text-muted-foreground mt-2">
                * Preise verstehen sich zzgl. gesetzlicher MwSt.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}