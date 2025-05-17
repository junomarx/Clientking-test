import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Printer, FileText, AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Typ-Definition für Print-Templates
interface PrintTemplate {
  id: number;
  title: string;
  content: string;
  type: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Schema für die Bon-Einstellungen
const receiptSettingsSchema = z.object({
  receiptWidth: z.enum(["58mm", "80mm"])
});

type ReceiptSettingsFormValues = z.infer<typeof receiptSettingsSchema>;

export function PrintSettingsTab() {
  const { toast } = useToast();
  const [activeTemplateType, setActiveTemplateType] = React.useState<string>("repair-order");
  const { settings, isLoading: isLoadingSettings } = useBusinessSettings();
  
  // Formular für Bon-Einstellungen
  const receiptForm = useForm<ReceiptSettingsFormValues>({
    resolver: zodResolver(receiptSettingsSchema),
    defaultValues: {
      receiptWidth: "80mm",
    },
  });

  // Initialisieren der Formularwerte, wenn Einstellungen geladen werden
  React.useEffect(() => {
    if (settings) {
      const receiptWidth = (settings.receiptWidth === "58mm" || settings.receiptWidth === "80mm") 
        ? settings.receiptWidth as "58mm" | "80mm" 
        : "80mm" as const;
      
      receiptForm.reset({ receiptWidth });
    }
  }, [settings, receiptForm]);
  
  // Mutation für die Aktualisierung der Bon-Einstellungen
  const updateReceiptSettingsMutation = useMutation({
    mutationFn: async (data: ReceiptSettingsFormValues) => {
      const response = await apiRequest("POST", "/api/business-settings", {
        ...settings,
        ...data
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      toast({
        title: "Erfolg!",
        description: "Die Bon-Einstellungen wurden gespeichert.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Bon-Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  // Formular absenden
  function onSubmitReceiptSettings(data: ReceiptSettingsFormValues) {
    updateReceiptSettingsMutation.mutate(data);
  }
  
  // Abfrage für Print-Templates
  const { data: templates, isLoading, error } = useQuery<PrintTemplate[]>({
    queryKey: ['/api/print-templates'],
  });

  // Filter für verschiedene Template-Typen
  const repairOrderTemplates = templates?.filter(t => t.type === 'repair-order') || [];
  const receiptTemplates = templates?.filter(t => t.type === 'receipt') || [];
  const pickupTemplates = templates?.filter(t => t.type === 'pickup') || [];
  // Kostenvoranschlag-Templates entfernt - werden später neu implementiert

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Lade Druckvorlagen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-500 mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="font-medium">Fehler beim Laden der Druckvorlagen</h3>
            </div>
            <p className="text-sm text-red-600">
              Die Druckvorlagen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Druckeinstellungen</h1>
          <p className="text-sm text-gray-500">Verwalten Sie Ihre Druckvorlagen</p>
        </div>
      </div>

      {/* Bon-Einstellungen */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
          <CardTitle className="text-base md:text-lg font-semibold">Bon-Einstellungen</CardTitle>
          <CardDescription className="text-xs md:text-sm">Konfigurieren Sie Ihre Bon-Ausgabe</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
          <Form {...receiptForm}>
            <form onSubmit={receiptForm.handleSubmit(onSubmitReceiptSettings)} className="space-y-4">
              <FormField
                control={receiptForm.control}
                name="receiptWidth"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-sm">Bon-Breite</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue placeholder="Bon-Breite wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58mm">58mm (Thermo-Drucker)</SelectItem>
                          <SelectItem value="80mm">80mm (Standard-Drucker)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button 
                  type="submit"
                  disabled={updateReceiptSettingsMutation.isPending} 
                  variant="default" 
                  size="sm" 
                  className="flex items-center h-8 text-xs px-3"
                >
                  <Save className="h-3 w-3 mr-1" /> Speichern
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Mobile view: Select dropdown for template types */}
      <div className="block md:hidden mb-4">
        <select 
          className="w-full p-2 border rounded-md text-sm" 
          value={activeTemplateType}
          onChange={(e) => setActiveTemplateType(e.target.value)}
        >
          <option value="repair-order">Reparaturaufträge</option>
          <option value="receipt">Kassenbelege</option>
          <option value="pickup">Abholscheine</option>
        </select>
      </div>

      <Tabs value={activeTemplateType} onValueChange={setActiveTemplateType}>
        {/* Desktop view: Tab list */}
        <TabsList className="mb-6 hidden md:flex">
          <TabsTrigger value="repair-order">Reparaturaufträge</TabsTrigger>
          <TabsTrigger value="receipt">Kassenbelege</TabsTrigger>
          <TabsTrigger value="pickup">Abholscheine</TabsTrigger>
          {/* Kostenvoranschlag-Tab entfernt - wird später neu implementiert */}
        </TabsList>

        <TabsContent value="repair-order">
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                <CardTitle className="text-base md:text-lg font-semibold">Vorlagen für Reparaturaufträge</CardTitle>
                <CardDescription className="text-xs md:text-sm">Diese Vorlagen werden für Reparaturaufträge verwendet</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                {repairOrderTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Printer className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Reparaturaufträge erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {repairOrderTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm md:text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-[10px] md:text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-[10px] md:text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <p className="text-[10px] md:text-xs text-gray-500 italic mt-2">
                            Wird automatisch im Reparaturablauf verwendet
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receipt">
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                <CardTitle className="text-base md:text-lg font-semibold">Vorlagen für Kassenbelege</CardTitle>
                <CardDescription className="text-xs md:text-sm">Diese Vorlagen werden für Kassenbelege verwendet</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                {receiptTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Printer className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Kassenbelege erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {receiptTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm md:text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-[10px] md:text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-[10px] md:text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <p className="text-[10px] md:text-xs text-gray-500 italic mt-2">
                            Wird automatisch im Reparaturablauf verwendet
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pickup">
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                <CardTitle className="text-base md:text-lg font-semibold">Vorlagen für Abholscheine</CardTitle>
                <CardDescription className="text-xs md:text-sm">Diese Vorlagen werden für Abholscheine verwendet</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                {pickupTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Printer className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Abholscheine erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {pickupTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm md:text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-[10px] md:text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-[10px] md:text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <p className="text-[10px] md:text-xs text-gray-500 italic mt-2">
                            Wird automatisch im Reparaturablauf verwendet
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Kostenvoranschlag-Tab entfernt - wird später neu implementiert */}
      </Tabs>
    </div>
  );
}