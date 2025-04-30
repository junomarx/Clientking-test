import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash2, AlertCircle, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface DeviceIssue {
  id: number;
  description: string;
  deviceType: string;
  createdAt: string;
  updatedAt: string;
}

export function DeviceIssuesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Prüfen, ob Benutzer Admin ist (nur Bugi darf Fehlerbeschreibungen verwalten)
  const isAdmin = user?.isAdmin && user?.username === 'bugi';
  
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('');
  const [newIssueDescription, setNewIssueDescription] = useState<string>('');
  const [editingIssue, setEditingIssue] = useState<DeviceIssue | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');

  // Gerätetypen abrufen
  const { data: deviceTypes, isLoading: isLoadingDeviceTypes } = useQuery({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/device-types');
      return await response.json();
    },
  });
  
  // Fehlerbeschreibungen für den ausgewählten Gerätetyp abrufen
  const {
    data: deviceIssues,
    isLoading: isLoadingIssues,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['/api/admin/device-issues', selectedDeviceType],
    queryFn: async () => {
      if (!selectedDeviceType) return [];
      
      const response = await apiRequest('GET', `/api/admin/device-issues/${selectedDeviceType}`);
      return await response.json();
    },
    enabled: !!selectedDeviceType && isAdmin,
  });

  // Neue Fehlerbeschreibung erstellen
  const createIssueMutation = useMutation({
    mutationFn: async (data: { description: string; deviceType: string }) => {
      const response = await apiRequest('POST', '/api/admin/device-issues', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-issues', selectedDeviceType] });
      setNewIssueDescription('');
      toast({
        title: 'Erfolg',
        description: 'Fehlerbeschreibung wurde erstellt.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: `Fehlerbeschreibung konnte nicht erstellt werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Fehlerbeschreibung aktualisieren
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { description: string } }) => {
      const response = await apiRequest('PATCH', `/api/admin/device-issues/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-issues', selectedDeviceType] });
      setEditingIssue(null);
      toast({
        title: 'Erfolg',
        description: 'Fehlerbeschreibung wurde aktualisiert.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: `Fehlerbeschreibung konnte nicht aktualisiert werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Fehlerbeschreibung löschen
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/device-issues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-issues', selectedDeviceType] });
      toast({
        title: 'Erfolg',
        description: 'Fehlerbeschreibung wurde gelöscht.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: `Fehlerbeschreibung konnte nicht gelöscht werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handler für Formular-Submit
  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newIssueDescription || !selectedDeviceType) {
      toast({
        title: 'Eingabefehler',
        description: 'Bitte Gerätetyp und Fehlerbeschreibung eingeben.',
        variant: 'destructive',
      });
      return;
    }
    
    createIssueMutation.mutate({
      description: newIssueDescription,
      deviceType: selectedDeviceType,
    });
  };

  // Handler für Bearbeitung speichern
  const handleSaveEdit = () => {
    if (!editingIssue || !editedDescription) return;
    
    updateIssueMutation.mutate({
      id: editingIssue.id,
      data: { description: editedDescription },
    });
  };

  // Handler für Abbrechen der Bearbeitung
  const handleCancelEdit = () => {
    setEditingIssue(null);
    setEditedDescription('');
  };

  // Handler für Löschen einer Fehlerbeschreibung
  const handleDeleteIssue = (id: number) => {
    if (window.confirm('Möchten Sie diese Fehlerbeschreibung wirklich löschen?')) {
      deleteIssueMutation.mutate(id);
    }
  };

  // Handler für Änderung des Gerätetyps
  const handleDeviceTypeChange = (value: string) => {
    setSelectedDeviceType(value);
    setNewIssueDescription('');
    setEditingIssue(null);
  };

  // Wenn Bearbeitung gestartet wird, setze editedDescription auf den aktuellen Wert
  useEffect(() => {
    if (editingIssue) {
      setEditedDescription(editingIssue.description);
    } else {
      setEditedDescription('');
    }
  }, [editingIssue]);

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
    <Card>
      <CardHeader>
        <CardTitle>Fehlerbeschreibungen verwalten</CardTitle>
        <CardDescription>
          Erstellen und verwalten Sie vordefinierte Fehlerbeschreibungen für verschiedene Gerätetypen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Gerätetyp-Auswahl */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="deviceType">Gerätetyp auswählen</Label>
              <Select
                value={selectedDeviceType}
                onValueChange={handleDeviceTypeChange}
              >
                <SelectTrigger id="deviceType">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDeviceTypes ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    deviceTypes?.map((type: any) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Neue Fehlerbeschreibung hinzufügen */}
          {selectedDeviceType && (
            <form onSubmit={handleAddIssue} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="newIssueDescription">
                  Neue Fehlerbeschreibung für {selectedDeviceType}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="newIssueDescription"
                    placeholder="Fehlerbeschreibung eingeben..."
                    value={newIssueDescription}
                    onChange={(e) => setNewIssueDescription(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={createIssueMutation.isPending || !newIssueDescription.trim()}
                  >
                    {createIssueMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Hinzufügen
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Fehlerbeschreibungen anzeigen */}
          {selectedDeviceType && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70%]">Fehlerbeschreibung</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingIssues ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : deviceIssues?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                        Keine Fehlerbeschreibungen für diesen Gerätetyp verfügbar
                      </TableCell>
                    </TableRow>
                  ) : (
                    deviceIssues?.map((issue: DeviceIssue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          {editingIssue?.id === issue.id ? (
                            <Input
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div className="font-medium">{issue.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingIssue?.id === issue.id ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveEdit}
                                className="h-8 w-8 p-0"
                                disabled={!editedDescription.trim() || updateIssueMutation.isPending}
                              >
                                {updateIssueMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingIssue(issue)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteIssue(issue.id)}
                                className="h-8 w-8 p-0"
                                disabled={deleteIssueMutation.isPending}
                              >
                                {deleteIssueMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}