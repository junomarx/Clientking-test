import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, PlusCircle, Trash, Plus, Pencil, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type DeviceType = {
  id: number;
  name: string;
};

type DeviceIssue = {
  id: number;
  description: string;
};

export function DeviceIssuesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [editingIssue, setEditingIssue] = useState<DeviceIssue | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<DeviceIssue | null>(null);
  
  const isAdmin = user?.isAdmin || false;
  
  // Query für Gerätetypen
  const deviceTypesQuery = useQuery<DeviceType[]>({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/device-types');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Gerätetypen');
      }
      return response.json();
    },
  });
  
  // Query für Fehlerbeschreibungen des ausgewählten Gerätetyps
  const deviceIssuesQuery = useQuery<DeviceIssue[]>({
    queryKey: ['/api/admin/device-issues', selectedDeviceType],
    queryFn: async () => {
      if (!selectedDeviceType) return [];
      
      const response = await apiRequest('GET', `/api/admin/device-issues/${selectedDeviceType}`);
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Fehlerbeschreibungen für ${selectedDeviceType}`);
      }
      return response.json();
    },
    enabled: !!selectedDeviceType,
  });
  
  // Mutation zum Hinzufügen einer Fehlerbeschreibung
  const createIssueMutation = useMutation({
    mutationFn: async ({ 
      description, 
      descriptions, 
      deviceType 
    }: { 
      description?: string, 
      descriptions?: string[], 
      deviceType: string 
    }) => {
      const payload = descriptions ? { descriptions, deviceType } : { description, deviceType };
      const response = await apiRequest('POST', '/api/admin/device-issues', payload);
      if (!response.ok) {
        throw new Error('Fehler beim Hinzufügen der Fehlerbeschreibung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-issues', selectedDeviceType] });
      setNewIssueDescription('');
      toast({
        title: 'Fehlerbeschreibung hinzugefügt',
        description: 'Die Fehlerbeschreibung wurde erfolgreich hinzugefügt.',
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
    mutationFn: async ({ id, description }: { id: number, description: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/device-issues/${id}`, { description });
      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Fehlerbeschreibung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-issues', selectedDeviceType] });
      setEditingIssue(null);
      setEditedDescription('');
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
      const response = await apiRequest('DELETE', `/api/admin/device-issues/${id}`);
      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Fehlerbeschreibung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-issues', selectedDeviceType] });
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
  
  // Handler zum Hinzufügen einer Fehlerbeschreibung
  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDeviceType) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Gerätetyp aus.',
        variant: 'destructive',
      });
      return;
    }
    
    // Text in Zeilen aufteilen und leere Zeilen entfernen
    const descriptionLines = newIssueDescription
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Wenn es mehrere Zeilen gibt, diese als separate Fehlerbeschreibungen hinzufügen
    if (descriptionLines.length > 1) {
      createIssueMutation.mutate({
        descriptions: descriptionLines,
        deviceType: selectedDeviceType
      });
    } else if (descriptionLines.length === 1) {
      // Wenn es nur eine Zeile gibt, diese als einzelne Fehlerbeschreibung hinzufügen
      createIssueMutation.mutate({
        description: descriptionLines[0],
        deviceType: selectedDeviceType
      });
    } else {
      // Wenn keine gültigen Fehlerbeschreibungen eingegeben wurden
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie mindestens eine Fehlerbeschreibung ein.',
        variant: 'destructive'
      });
    }
  };
  
  // Handler zum Bearbeiten einer Fehlerbeschreibung
  const handleEditClick = (issue: DeviceIssue) => {
    setEditingIssue(issue);
    setEditedDescription(issue.description);
  };
  
  // Handler zum Speichern der bearbeiteten Fehlerbeschreibung
  const handleSaveEdit = () => {
    if (editingIssue && editedDescription.trim()) {
      updateIssueMutation.mutate({
        id: editingIssue.id,
        description: editedDescription.trim()
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

  // Wenn der Benutzer kein Admin ist, zeige eine Informationsmeldung
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehlerbeschreibungen verwalten</CardTitle>
          <CardDescription>
            Nur Administratoren können Fehlerbeschreibungen verwalten.
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
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Fehlerbeschreibungen verwalten</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Erstellen und verwalten Sie vordefinierte Fehlerbeschreibungen für verschiedene Gerätetypen
        </p>
        
        {/* Gerätetyp-Auswahl */}
        <div className="mb-6">
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

        {/* Neue Fehlerbeschreibung hinzufügen */}
        {selectedDeviceType && (
          <form onSubmit={handleAddIssue} className="space-y-4 bg-muted/30 p-4 rounded-md mb-6">
            <div>
              <h3 className="text-base font-medium mb-2">
                Neue Fehlerbeschreibungen für {selectedDeviceType}
              </h3>
              <div className="space-y-4">
                <Textarea
                  id="newIssueDescription"
                  placeholder="z.B. Display defekt
Akku schwach
Wasserschaden
Lautsprecher defekt"
                  className="min-h-[120px] w-full"
                  value={newIssueDescription}
                  onChange={(e) => setNewIssueDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Geben Sie jede Fehlerbeschreibung in einer neuen Zeile ein.
                </p>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto" 
                  disabled={createIssueMutation.isPending}
                >
                  {createIssueMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird hinzugefügt...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Fehlerbeschreibungen hinzufügen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
        
        {/* Liste der Fehlerbeschreibungen */}
        {selectedDeviceType && (
          <div>
            <h3 className="text-base font-medium mb-2">Vorhandene Fehlerbeschreibungen für {selectedDeviceType}</h3>
            
            {deviceIssuesQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : deviceIssuesQuery.data && deviceIssuesQuery.data.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-full">Fehlerbeschreibung</TableHead>
                      <TableHead className="w-[100px] text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceIssuesQuery.data.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          {editingIssue?.id === issue.id ? (
                            <Input
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            issue.description
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {editingIssue?.id === issue.id ? (
                            <div className="flex items-center justify-end space-x-2">
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
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(issue)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(issue)}
                                className="text-destructive"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 bg-muted rounded-md">
                <p className="text-muted-foreground">
                  Keine Fehlerbeschreibungen für {selectedDeviceType} vorhanden.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Löschen-Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fehlerbeschreibung löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie die Fehlerbeschreibung "{issueToDelete?.description}" löschen möchten?
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}