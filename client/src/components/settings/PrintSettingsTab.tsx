import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Printer, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function PrintSettingsTab() {
  const { toast } = useToast();
  const [activeTemplateType, setActiveTemplateType] = React.useState<string>("repair-order");
  
  // Abfrage für Print-Templates
  const { data: templates, isLoading, error } = useQuery<PrintTemplate[]>({
    queryKey: ['/api/print-templates'],
  });

  // Filter für verschiedene Template-Typen
  const repairOrderTemplates = templates?.filter(t => t.type === 'repair-order') || [];
  const receiptTemplates = templates?.filter(t => t.type === 'receipt') || [];
  const pickupTemplates = templates?.filter(t => t.type === 'pickup') || [];
  const costEstimateTemplates = templates?.filter(t => t.type === 'cost-estimate') || [];

  // Test-Druck-Funktion
  const handlePrintTest = (templateId: number) => {
    // Hier würde normalerweise ein API-Aufruf zum Testen des Drucks erfolgen
    toast({
      title: "Testdruck gestartet",
      description: `Template ID: ${templateId} wird gedruckt.`,
      duration: 2000,
    });
  };

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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Druckeinstellungen</h1>
          <p className="text-gray-500">Verwalten Sie Ihre Druckvorlagen</p>
        </div>
      </div>

      <Tabs value={activeTemplateType} onValueChange={setActiveTemplateType}>
        <TabsList className="mb-6">
          <TabsTrigger value="repair-order">Reparaturaufträge</TabsTrigger>
          <TabsTrigger value="receipt">Kassenbelege</TabsTrigger>
          <TabsTrigger value="pickup">Abholscheine</TabsTrigger>
          <TabsTrigger value="cost-estimate">Kostenvoranschläge</TabsTrigger>
        </TabsList>

        <TabsContent value="repair-order">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Vorlagen für Reparaturaufträge</CardTitle>
                <CardDescription>Diese Vorlagen werden für Reparaturaufträge verwendet</CardDescription>
              </CardHeader>
              <CardContent>
                {repairOrderTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Printer className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Reparaturaufträge erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {repairOrderTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintTest(template.id)}
                              className="text-xs"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Testdruck
                            </Button>
                          </div>
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
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Vorlagen für Kassenbelege</CardTitle>
                <CardDescription>Diese Vorlagen werden für Kassenbelege verwendet</CardDescription>
              </CardHeader>
              <CardContent>
                {receiptTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Printer className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Kassenbelege erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {receiptTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintTest(template.id)}
                              className="text-xs"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Testdruck
                            </Button>
                          </div>
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
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Vorlagen für Abholscheine</CardTitle>
                <CardDescription>Diese Vorlagen werden für Abholscheine verwendet</CardDescription>
              </CardHeader>
              <CardContent>
                {pickupTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Printer className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Abholscheine erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pickupTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintTest(template.id)}
                              className="text-xs"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Testdruck
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cost-estimate">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Vorlagen für Kostenvoranschläge</CardTitle>
                <CardDescription>Diese Vorlagen werden für Kostenvoranschläge verwendet</CardDescription>
              </CardHeader>
              <CardContent>
                {costEstimateTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Es wurden noch keine Vorlagen für Kostenvoranschläge erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vorlagen werden vom Superadmin verwaltet und können hier nur verwendet werden.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {costEstimateTemplates.map((template) => (
                      <Card key={template.id} className={`overflow-hidden ${template.isDefault ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-md">{template.title}</CardTitle>
                            {template.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Standard</span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            Zuletzt aktualisiert: {new Date(template.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintTest(template.id)}
                              className="text-xs"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Testdruck
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}