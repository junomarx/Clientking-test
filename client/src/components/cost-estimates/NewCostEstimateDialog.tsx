import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Validierungsschema für das Formular
const costEstimateSchema = z.object({
  // Kundendaten
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  address: z.string().min(1, "Adresse ist erforderlich"),
  postalCode: z.string().min(1, "PLZ ist erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  
  // Gerätedaten
  deviceType: z.string().min(1, "Gerätetyp ist erforderlich"),
  manufacturer: z.string().min(1, "Hersteller ist erforderlich"),
  model: z.string().min(1, "Modell ist erforderlich"),
  serialNumber: z.string().optional(),
  
  // Fehlerbeschreibung und Arbeiten
  issueDescription: z.string().min(1, "Fehlerbeschreibung ist erforderlich"),
  workToBeDone: z.string().min(1, "Durchzuführende Arbeiten ist erforderlich"),
  
  // Preisdaten
  totalPrice: z.string().min(1, "Gesamtpreis ist erforderlich")
});

type CostEstimateFormData = z.infer<typeof costEstimateSchema>;

interface NewCostEstimateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateCostEstimate?: (data: CostEstimateFormData) => void;
}

export function NewCostEstimateDialog({ 
  open, 
  onClose,
  onCreateCostEstimate 
}: NewCostEstimateDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<CostEstimateFormData>({
    resolver: zodResolver(costEstimateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      postalCode: "",
      city: "",
      phone: "",
      email: "",
      deviceType: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      issueDescription: "",
      workToBeDone: "",
      totalPrice: ""
    }
  });
  
  const onSubmit = (data: CostEstimateFormData) => {
    console.log("Formular-Daten:", data);
    
    // Kostenvoranschlag erstellen
    if (onCreateCostEstimate) {
      onCreateCostEstimate(data);
    }
    
    // Erfolgsmeldung anzeigen
    toast({
      title: "Kostenvoranschlag erstellt",
      description: `Für ${data.firstName} ${data.lastName} - ${data.manufacturer} ${data.model}`,
    });
    
    // Dialog schließen und Formular zurücksetzen
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Kostenvoranschlag erstellen</DialogTitle>
          <DialogDescription>
            Geben Sie die Details für den neuen Kostenvoranschlag ein.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Kundendaten */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Kundendaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname*</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Nachname*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Adresse*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PLZ*</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Telefonnummer*</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
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
                      <FormLabel>E-Mail*</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Gerätedaten */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Gerätedaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gerätetyp*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="z.B. Smartphone, Laptop, Tablet" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hersteller*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modell*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seriennummer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Fehlerbeschreibung und Arbeiten */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Fehlerbeschreibung und Arbeiten</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="issueDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fehlerbeschreibung*</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="workToBeDone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durchzuführende Arbeiten*</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem className="md:w-1/2">
                      <FormLabel>Gesamtpreis (€)*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="z.B. 150,00 €" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => {
                  form.reset();
                  onClose();
                }}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-primary to-blue-600"
              >
                Kostenvoranschlag erstellen
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default NewCostEstimateDialog;