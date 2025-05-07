import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";

interface HerstellerBulkImportProps {
  deviceTypes: string[] | undefined;
}

// Validierungsschema für das Formular
const bulkImportSchema = z.object({
  deviceType: z.string().min(1, "Bitte wählen Sie einen Gerätetyp aus"),
  brands: z.string().min(3, "Bitte geben Sie mindestens einen Markennamen ein"),
});

type BulkImportFormValues = z.infer<typeof bulkImportSchema>;

export default function HerstellerBulkImport({ deviceTypes }: HerstellerBulkImportProps) {
  const { toast } = useToast();
  const [importInProgress, setImportInProgress] = useState(false);
  
  // Formularsteuerung mit react-hook-form und zod für Validierung
  const form = useForm<BulkImportFormValues>({
    resolver: zodResolver(bulkImportSchema),
    defaultValues: {
      deviceType: "",
      brands: "",
    },
  });

  // Mutation für den Massenimport
  const bulkImportMutation = useMutation({
    mutationFn: async (data: BulkImportFormValues) => {
      // Bereite die Markenliste vor und debugge sie
      const brandsList = data.brands.split('\n')
          .map(brand => brand.trim())
          .filter(brand => brand.length > 0);
      
      console.log('Marken zum Import:', brandsList);
      console.log('Gerätetyp zum Import:', data.deviceType);
      
      const response = await apiRequest('POST', '/api/superadmin/device-brands/bulk', {
        deviceType: data.deviceType,
        brands: brandsList
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Massenimport');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      
      if (data.importedCount > 0) {
        toast({
          title: "Import erfolgreich",
          description: `${data.importedCount} Marken wurden erfolgreich importiert.`,
        });
      } else {
        toast({
          title: "Keine neuen Marken importiert",
          description: "Alle angegebenen Marken existieren bereits für diesen Gerätetyp.",
          variant: "warning"
        });
      }
      
      form.reset();
      setImportInProgress(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Import",
        description: error.message,
        variant: "destructive",
      });
      setImportInProgress(false);
    },
  });

  // Formular abschicken
  function onSubmit(data: BulkImportFormValues) {
    setImportInProgress(true);
    bulkImportMutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marken-Massenimport</CardTitle>
        <CardDescription>
          Importieren Sie mehrere Marken auf einmal für einen Gerätetyp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gerätetyp</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={importInProgress}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Gerätetyp auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deviceTypes?.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="brands"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Markennamen</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Geben Sie jeden Markennamen in eine neue Zeile ein"
                      className="min-h-[120px]"
                      {...field}
                      disabled={importInProgress}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pro Zeile ein Markenname. Leerzeilen werden ignoriert.
                  </p>
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={importInProgress}>
              {importInProgress ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Importiere...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Marken importieren
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
