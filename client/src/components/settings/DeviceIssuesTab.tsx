import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smartphone, Tablet, Laptop, Watch, Gamepad2, AlertCircle, Loader2, PlusCircle, Trash, Pencil, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type DeviceType = {
  id: number;
  name: string;
};

type DeviceIssue = {
  id: number;
  title: string;
  description: string;
  deviceType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isCommon: boolean;
};

// Gerätekategorien mit Icons und Namen als Tooltip - nur tatsächlich vorhandene Gerätetypen
const deviceCategories = [
  { id: 'smartphone', name: 'Smartphone', icon: <Smartphone className="h-5 w-5" /> },
  { id: 'tablet', name: 'Tablet', icon: <Tablet className="h-5 w-5" /> },
  { id: 'laptop', name: 'Laptop', icon: <Laptop className="h-5 w-5" /> },
  { id: 'watch', name: 'Smartwatch', icon: <Watch className="h-5 w-5" /> },
  { id: 'spielekonsole', name: 'Spielekonsole', icon: <Gamepad2 className="h-5 w-5" /> }
];

export function DeviceIssuesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");
  const [bulkInput, setBulkInput] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<DeviceIssue | null>(null);
  const [editingIssue, setEditingIssue] = useState<DeviceIssue | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  
  const isAdmin = user?.isAdmin || false;
  const isSuperadmin = user?.isSuperadmin || false;
  
  // Query für Gerätetypen
  const { data: deviceTypes, isLoading: isLoadingDeviceTypes } = useQuery({
    queryKey: ['/api/global/device-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/global/device-types');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Gerätetypen');
      }
      return response.json();
    }
  });
  
  // Query für alle Fehlerbeschreibungen
  const { data: allIssues, isLoading: isLoadingIssues } = useQuery({
    queryKey: ['/api/superadmin/device-issues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/device-issues');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Fehlerbeschreibungen');
      }
      return response.json();
    },
    enabled: isAdmin || isSuperadmin
  });
  
  // Mutation zum Importieren von Fehlern
  const bulkImportMutation = useMutation({
    mutationFn: async ({ deviceType, errors }: { deviceType: string, errors: string[] }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues/bulk', { 
        deviceType, 
        errors 
      });
      if (!response.ok) {
        throw new Error('Fehler beim Importieren der Fehler');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setBulkInput('');
      toast({
        title: 'Fehler importiert',
        description: 'Die Fehler wurden erfolgreich importiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Mutation zum Löschen eines Fehlers
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Fehlers');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setDeleteDialogOpen(false);
      setIssueToDelete(null);
      toast({
        title: 'Fehler gelöscht',
        description: 'Der Fehler wurde erfolgreich gelöscht.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Mutation zum Aktualisieren eines Fehlers
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number, title: string }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/device-issues/${id}`, { title });
      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Fehlers');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setEditingIssue(null);
      setEditedTitle('');
      toast({
        title: 'Fehler aktualisiert',
        description: 'Der Fehler wurde erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Handler für Import-Button
  const handleImport = () => {
    if (!selectedDeviceType) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Gerätetyp aus.',
        variant: 'destructive'
      });
      return;
    }
    
    // Text in Zeilen aufteilen und leere Zeilen entfernen
    const errors = bulkInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (errors.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie mindestens einen Fehler ein.',
        variant: 'destructive'
      });
      return;
    }
    
    bulkImportMutation.mutate({
      deviceType: selectedDeviceType,
      errors
    });
  };
  
  // Handler zum Bearbeiten eines Fehlers
  const handleEditClick = (issue: DeviceIssue) => {
    setEditingIssue(issue);
    setEditedTitle(issue.title);
  };
  
  // Handler zum Speichern der Bearbeitung
  const handleSaveEdit = () => {
    if (editingIssue && editedTitle.trim()) {
      updateIssueMutation.mutate({
        id: editingIssue.id,
        title: editedTitle.trim()
      });
    }
  };
  
  // Handler zum Öffnen des Löschdialogs
  const handleDeleteClick = (issue: DeviceIssue) => {
    setIssueToDelete(issue);
    setDeleteDialogOpen(true);
  };
  
  // Handler zum Bestätigen des Löschens
  const confirmDelete = () => {
    if (issueToDelete) {
      deleteIssueMutation.mutate(issueToDelete.id);
    }
  };
  
  // Wenn der Benutzer kein Admin und kein Superadmin ist, zeige die Info-Meldung
  if (!isAdmin && !isSuperadmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehlerkatalog verwalten</CardTitle>
          <CardDescription>
            Nur Administratoren können den Fehlerkatalog verwalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Keine Berechtigung</p>
              <p className="text-sm text-muted-foreground mt-2">
                Sie benötigen Administratorrechte, um auf diese Funktion zuzugreifen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fehlerkatalog</h2>
          <p className="text-muted-foreground">
            Fehler nach Gerätetyp kategorisiert
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Import-Formular */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlerkatalog-Import</CardTitle>
            <CardDescription>
              Wählen Sie einen Gerätetyp und fügen Sie eine Liste von Fehlern ein (einer pro Zeile)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="deviceType">Gerätetyp</Label>
                <Select 
                  value={selectedDeviceType} 
                  onValueChange={setSelectedDeviceType}
                >
                  <SelectTrigger id="deviceType" className="w-full">
                    <SelectValue placeholder="Gerätetyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDeviceTypes ? (
                      <SelectItem value="loading" disabled>
                        Wird geladen...
                      </SelectItem>
                    ) : deviceTypes && deviceTypes.length > 0 ? (
                      deviceTypes.map((type: any) => (
                        <SelectItem key={type.name} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Keine Gerätetypen verfügbar
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bulkInput">Fehler (einer pro Zeile)</Label>
                <Textarea 
                  id="bulkInput"
                  placeholder="z. B.&#10;Displaybruch&#10;Akku defekt&#10;Wasserschaden"
                  className="min-h-[150px] mt-2"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                />
              </div>
              
              <Button 
                className="w-full md:w-auto"
                onClick={handleImport}
                disabled={bulkImportMutation.isPending || !selectedDeviceType}
              >
                {bulkImportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird importiert...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Fehler importieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Fehlerkatalog-Tabelle */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlerkatalog-Übersicht</CardTitle>
            <CardDescription>
              Fehler nach Gerätetyp kategorisiert
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingIssues ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : allIssues && allIssues.length > 0 ? (
              <ScrollArea className="h-[500px] w-full rounded-md border">
                <div className="p-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left font-medium border w-full">Fehler</th>
                        {deviceCategories.map(category => (
                          <th key={category.id} className="p-2 text-center font-medium border" title={category.name}>
                            <div className="flex justify-center">
                              {category.icon}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 text-center font-medium border">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Gruppiere Fehler nach Titel */}
                      {Array.from(new Set(allIssues.map((issue: DeviceIssue) => issue.title))).map((title, index) => {
                        const issuesWithTitle = allIssues.filter((issue: DeviceIssue) => issue.title === title);
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                            <td className="p-2 border">
                              {editingIssue?.title === title ? (
                                <input
                                  type="text"
                                  value={editedTitle}
                                  onChange={(e) => setEditedTitle(e.target.value)}
                                  className="w-full p-1 border rounded-md"
                                />
                              ) : (
                                title
                              )}
                            </td>
                            
                            {/* Checkbox für jeden Gerätetyp */}
                            {deviceCategories.map(category => {
                              const hasIssue = issuesWithTitle.some(
                                (issue: DeviceIssue) => issue.deviceType.toLowerCase() === category.id.toLowerCase()
                              );
                              
                              return (
                                <td key={`${title}-${category.id}`} className="p-2 text-center border">
                                  <Checkbox checked={hasIssue} disabled />
                                </td>
                              );
                            })}
                            
                            {/* Aktionen */}
                            <td className="p-2 text-center border">
                              <div className="flex items-center justify-center space-x-2">
                                {editingIssue?.title === title ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      className="h-8 px-2"
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingIssue(null)}
                                      className="h-8 px-2"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditClick(issuesWithTitle[0])}
                                      className="h-8 px-2"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteClick(issuesWithTitle[0])}
                                      className="h-8 px-2 text-destructive"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Keine Fehler gefunden</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Beginnen Sie mit dem Import von Fehlern über das Formular oben.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Lösch-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fehler löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Fehler "{issueToDelete?.title}" löschen möchten?
              Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}