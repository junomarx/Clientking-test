import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, PlusCircle, Trash, Pencil, Save, X, Smartphone, Tablet, Laptop, Watch, Gamepad2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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

// Icon-Mapping für Gerätetypen
const deviceTypeIcons: Record<string, JSX.Element> = {
  'smartphone': <Smartphone className="h-5 w-5" />,
  'tablet': <Tablet className="h-5 w-5" />,
  'laptop': <Laptop className="h-5 w-5" />,
  'watch': <Watch className="h-5 w-5" />,
  'spielekonsole': <Gamepad2 className="h-5 w-5" />
};

// Liste der unterstützten Gerätetypen
const supportedDeviceTypes = [
  { id: 'smartphone', name: 'Smartphone' },
  { id: 'tablet', name: 'Tablet' },
  { id: 'laptop', name: 'Laptop' },
  { id: 'watch', name: 'Smartwatch' },
  { id: 'spielekonsole', name: 'Spielekonsole' }
];

export function DeviceIssuesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [editingIssue, setEditingIssue] = useState<DeviceIssue | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<DeviceIssue | null>(null);
  
  const isAdmin = user?.isAdmin || false;
  const isSuperadmin = user?.isSuperadmin || false;
  
  // Query für Gerätetypen
  const deviceTypesQuery = useQuery<DeviceType[]>({
    queryKey: ['/api/global/device-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/global/device-types');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Gerätetypen');
      }
      return response.json();
    },
  });
  
  // Query für alle Fehlerbeschreibungen (für die Superadmin-Tabelle)
  const allIssuesQuery = useQuery<DeviceIssue[]>({
    queryKey: ['/api/superadmin/device-issues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/device-issues');
      if (!response.ok) {
        throw new Error('Fehler beim Laden aller Fehlerbeschreibungen');
      }
      return response.json();
    },
    enabled: isSuperadmin,
  });
  
  // Query für Fehlerbeschreibungen des ausgewählten Gerätetyps
  const deviceIssuesQuery = useQuery<DeviceIssue[]>({
    queryKey: ['/api/superadmin/device-issues', selectedDeviceType],
    queryFn: async () => {
      if (!selectedDeviceType) return [];
      
      const response = await apiRequest('GET', `/api/superadmin/device-issues/${selectedDeviceType}`);
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Fehlerbeschreibungen für ${selectedDeviceType}`);
      }
      return response.json();
    },
    enabled: !!selectedDeviceType,
  });
  
  // Mutation zum Hinzufügen von Fehlerbeschreibungen
  const bulkImportMutation = useMutation({
    mutationFn: async ({ deviceType, errors }: { deviceType: string, errors: string[] }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues/bulk', { deviceType, errors });
      if (!response.ok) {
        throw new Error('Fehler beim Massenimport von Fehlerbeschreibungen');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues', selectedDeviceType] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setBulkInput('');
      toast({
        title: 'Fehlerbeschreibungen importiert',
        description: 'Die Fehlerbeschreibungen wurden erfolgreich importiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation zum Aktualisieren einer Fehlerbeschreibung
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number, title: string }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/device-issues/${id}`, { title });
      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Fehlerbeschreibung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues', selectedDeviceType] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setEditingIssue(null);
      setEditedTitle('');
      toast({
        title: 'Fehlerbeschreibung aktualisiert',
        description: 'Die Fehlerbeschreibung wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation zum Löschen einer Fehlerbeschreibung
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Fehlerbeschreibung');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues', selectedDeviceType] });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setDeleteDialogOpen(false);
      setIssueToDelete(null);
      toast({
        title: 'Fehlerbeschreibung gelöscht',
        description: 'Die Fehlerbeschreibung wurde erfolgreich gelöscht.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handler zum Importieren mehrerer Fehlerbeschreibungen
  const handleImport = () => {
    if (!selectedDeviceType) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Gerätetyp aus.',
        variant: 'destructive',
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
        description: 'Bitte geben Sie mindestens eine Fehlerbeschreibung ein.',
        variant: 'destructive'
      });
      return;
    }
    
    bulkImportMutation.mutate({
      deviceType: selectedDeviceType,
      errors: errors
    });
  };
  
  // Handler zum Bearbeiten einer Fehlerbeschreibung
  const handleEditClick = (issue: DeviceIssue) => {
    setEditingIssue(issue);
    setEditedTitle(issue.title);
  };
  
  // Handler zum Speichern der bearbeiteten Fehlerbeschreibung
  const handleSaveEdit = () => {
    if (editingIssue && editedTitle.trim()) {
      updateIssueMutation.mutate({
        id: editingIssue.id,
        title: editedTitle.trim()
      });
    }
  };
  
  // Handler zum Löschen einer Fehlerbeschreibung
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

  // Wenn der Benutzer kein Admin und kein Superadmin ist, zeige eine Informationsmeldung
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
        {/* Gerätetyp-Auswahl und Bulk-Import */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlerkatalog Bulk-Import</CardTitle>
            <CardDescription>
              Wählen Sie einen Gerätetyp und fügen Sie eine Liste von Fehlern ein (einer pro Zeile)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="deviceType" className="mb-2 block">Gerätetyp auswählen</Label>
                <div className="md:w-1/2 w-full">
                  <Select
                    value={selectedDeviceType || ""}
                    onValueChange={setSelectedDeviceType}
                  >
                    <SelectTrigger id="deviceType" className="w-full">
                      <SelectValue placeholder="Gerätetyp" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypesQuery.isLoading ? (
                        <SelectItem value="loading" disabled>
                          Wird geladen...
                        </SelectItem>
                      ) : deviceTypesQuery.data && deviceTypesQuery.data.length > 0 ? (
                        deviceTypesQuery.data.map((type) => (
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

        {/* Tabellarische Anzeige aller Fehler */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlerkatalog</CardTitle>
            <CardDescription>
              Kategorisierte Übersicht aller Fehler nach Gerätetyp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allIssuesQuery.isLoading ? (
              <div className="flex justify-center p-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : allIssuesQuery.data && allIssuesQuery.data.length > 0 ? (
              <ScrollArea className="h-[500px] w-full rounded-md border">
                <div className="p-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left font-medium border w-full">Fehler</th>
                        {supportedDeviceTypes.map(category => (
                          <th key={category.id} className="p-2 text-center font-medium border" title={category.name}>
                            <div className="flex justify-center">
                              {deviceTypeIcons[category.id.toLowerCase()] || category.name.charAt(0)}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 text-center font-medium border">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Gruppiere Fehler nach Titel und zeige für jeden Gerätetyp an, ob dieser Fehler existiert */}
                      {Array.from(new Set(allIssuesQuery.data.map(issue => issue.title))).map((title, index) => {
                        const issuesWithTitle = allIssuesQuery.data.filter(issue => issue.title === title);
                        
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
                            
                            {supportedDeviceTypes.map(deviceType => {
                              const hasIssue = issuesWithTitle.some(issue => 
                                issue.deviceType.toLowerCase() === deviceType.id.toLowerCase()
                              );
                              
                              return (
                                <td key={`${title}-${deviceType.id}`} className="p-2 text-center border">
                                  {hasIssue ? (
                                    <Checkbox defaultChecked disabled />
                                  ) : (
                                    <Checkbox disabled />
                                  )}
                                </td>
                              );
                            })}
                            
                            <td className="p-2 text-center border">
                              {editingIssue?.title === title ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleSaveEdit}
                                    disabled={updateIssueMutation.isPending}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingIssue(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditClick(issuesWithTitle[0])}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteClick(issuesWithTitle[0])}
                                    className="text-destructive"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 bg-muted rounded-md">
                <p className="text-muted-foreground">
                  Keine Fehlereinträge vorhanden.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Löschen-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fehlerbeschreibung löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Fehlerbeschreibung "{issueToDelete?.title}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}