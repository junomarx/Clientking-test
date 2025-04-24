import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BusinessSettings } from "@shared/schema";

const businessSettingsSchema = z.object({
  businessName: z.string().min(2, "Firmenname wird benötigt"),
  ownerFirstName: z.string().min(2, "Vorname wird benötigt"),
  ownerLastName: z.string().min(2, "Nachname wird benötigt"),
  taxId: z.string().optional(),
  streetAddress: z.string().min(3, "Straße wird benötigt"),
  city: z.string().min(2, "Ort wird benötigt"),
  zipCode: z.string().min(4, "PLZ wird benötigt"),
  country: z.string().min(2, "Land wird benötigt").default("Österreich"),
  phone: z.string().optional(),
  email: z.string().email("Ungültige E-Mail").optional(),
  website: z.string().optional(),
});

type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;

interface BusinessSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BusinessSettingsDialog({ open, onClose }: BusinessSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Lade die bestehenden Unternehmenseinstellungen
  const { data: settings, isLoading } = useQuery<BusinessSettings | null>({
    queryKey: ["/api/business-settings"],
    enabled: open,
  });

  const form = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      businessName: "",
      ownerFirstName: "",
      ownerLastName: "",
      taxId: "",
      streetAddress: "",
      city: "",
      zipCode: "",
      country: "Österreich",
      phone: "",
      email: "",
      website: "",
    },
  });

  // Aktualisiere die Formularwerte, wenn die Daten geladen sind
  React.useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName,
        ownerFirstName: settings.ownerFirstName,
        ownerLastName: settings.ownerLastName,
        taxId: settings.taxId || "",
        streetAddress: settings.streetAddress,
        city: settings.city,
        zipCode: settings.zipCode,
        country: settings.country,
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: BusinessSettingsFormValues) => {
      const response = await apiRequest("POST", "/api/business-settings", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      toast({
        title: "Erfolg!",
        description: "Unternehmenseinstellungen wurden aktualisiert.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: BusinessSettingsFormValues) {
    updateMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Unternehmenseinstellungen</DialogTitle>
          <DialogDescription>
            Geben Sie hier die Daten Ihres Unternehmens ein. Diese werden für Rechnungen und andere Dokumente verwendet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Unternehmensname*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Handyshop GmbH" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname des Inhabers*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Max" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nachname des Inhabers*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mustermann" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>UID-Nummer (ATU)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ATU12345678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Straße und Hausnummer*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Hauptstraße 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PLZ*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1010" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ort*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Wien" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Land*</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} placeholder="+43 1 234 5678" />
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
                      <Input {...field} placeholder="info@handyshop.at" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="www.handyshop.at" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full sm:w-auto"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}