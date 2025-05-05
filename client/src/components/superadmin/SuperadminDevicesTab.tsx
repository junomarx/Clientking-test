import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Search, Filter, AlertCircle, Smartphone, Tablet, Laptop, Watch } from "lucide-react";

// Interfaces für den Fehlerkatalog
interface DeviceIssue {
  id: number;
  deviceType: string;
  title: string;
  description: string;
  solution: string;
  severity: "low" | "medium" | "high" | "critical";
  isCommon: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SuperadminDevicesTab() {
  const { toast } = useToast();

  // State für den Fehlerkatalog
  const [selectedIssue, setSelectedIssue] = useState<DeviceIssue | null>(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isEditIssueOpen, setIsEditIssueOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  
  // Formular-State für Fehler
  const [issueForm, setIssueForm] = useState({
    deviceType: "",
    title: "",
    description: "",
    solution: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    isCommon: false
  });

  // Daten abfragen
  const { data: deviceIssues, isLoading: isLoadingIssues } = useQuery<DeviceIssue[]>({
    queryKey: ["/api/superadmin/device-issues"],
    enabled: true,
  });

  const { data: deviceTypes } = useQuery<string[]>({
    queryKey: ["/api/superadmin/device-types"],
    enabled: true,
  });

  // Mutations für API-Anfragen
  const createIssueMutation = useMutation({
    mutationFn: async (data: typeof issueForm) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Eintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich erstellt.",
      });
      setIsCreateIssueOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof issueForm }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/device-issues/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Eintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich aktualisiert.",
      });
      setIsEditIssueOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Eintrags');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Dialog-Handler
  const handleCreateIssue = () => {
    setIssueForm({
      deviceType: "",
      title: "",
      description: "",
      solution: "",
      severity: "medium",
      isCommon: false
    });
    setIsCreateIssueOpen(true);
  };

  const handleEditIssue = (issue: DeviceIssue) => {
    setSelectedIssue(issue);
    setIssueForm({
      deviceType: issue.deviceType,
      title: issue.title,
      description: issue.description,
      solution: issue.solution,
      severity: issue.severity,
      isCommon: issue.isCommon
    });
    setIsEditIssueOpen(true);
  };
  
  const handleDeleteIssue = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie diesen Fehlereintrag löschen möchten?')) {
      deleteIssueMutation.mutate(id);
    }
  };
  
  const handleSubmitCreateIssue = () => {
    if (!issueForm.title || !issueForm.deviceType || !issueForm.description) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    createIssueMutation.mutate(issueForm);
  };
  
  const handleSubmitEditIssue = () => {
    if (!selectedIssue) return;
    
    if (!issueForm.title || !issueForm.deviceType || !issueForm.description) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    
    updateIssueMutation.mutate({ id: selectedIssue.id, data: issueForm });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Geräteverwaltung</h1>
      <Tabs defaultValue="types" className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="types">Gerätetypen</TabsTrigger>
          <TabsTrigger value="brands">Marken</TabsTrigger>
          <TabsTrigger value="models">Modelle</TabsTrigger>
          <TabsTrigger value="issues">Fehlerkatalog</TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Gerätetypen</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die Gerätetypen angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Marken</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die Marken angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Modelle</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die Modelle angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Fehlerkatalog Tab */}
        <TabsContent value="issues">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Fehlerkatalog</CardTitle>
                <CardDescription>
                  Verwalten Sie häufige Geräteprobleme und Lösungen
                </CardDescription>
              </div>
              <Button onClick={handleCreateIssue}>
                <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center space-x-2">
                <div className="flex-1">
                  <Select 
                    value={selectedDeviceType || "all"}
                    onValueChange={(value) => setSelectedDeviceType(value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nach Gerätetyp filtern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Gerätetypen</SelectItem>
                      {deviceTypes?.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Suchen..." className="pl-8" />
                  </div>
                </div>
              </div>
              
              {isLoadingIssues ? (
                <div className="flex justify-center p-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : deviceIssues && deviceIssues.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gerätetyp</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Schweregrad</TableHead>
                        <TableHead>Häufig</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviceIssues
                        .filter(issue => !selectedDeviceType || issue.deviceType === selectedDeviceType)
                        .map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell>{issue.deviceType}</TableCell>
                            <TableCell>
                              <div className="font-medium">{issue.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {issue.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`
                                  ${issue.severity === 'low' ? 'bg-blue-100 text-blue-800' : ''}
                                  ${issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${issue.severity === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                  ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' : ''}
                                `}
                              >
                                {issue.severity === 'low' ? 'Niedrig' : ''}
                                {issue.severity === 'medium' ? 'Mittel' : ''}
                                {issue.severity === 'high' ? 'Hoch' : ''}
                                {issue.severity === 'critical' ? 'Kritisch' : ''}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {issue.isCommon ? (
                                <Badge variant="default" className="bg-green-500">
                                  Häufig
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  Selten
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditIssue(issue)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteIssue(issue.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Einträge gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    Es wurden keine Fehlereinträge gefunden. Fügen Sie neue Einträge hinzu, um den Katalog zu füllen.
                  </p>
                  <Button onClick={handleCreateIssue}>
                    <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog zum Erstellen eines neuen Fehlereintrags */}
      <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Neuen Fehlereintrag erstellen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Eintrag zum Fehlerkatalog hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={issueForm.deviceType}
                onValueChange={(value) => setIssueForm({...issueForm, deviceType: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Titel
              </Label>
              <Input
                id="title"
                value={issueForm.title}
                onChange={(e) => setIssueForm({...issueForm, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="severity" className="text-right">
                Schweregrad
              </Label>
              <Select
                value={issueForm.severity}
                onValueChange={(value) => setIssueForm({...issueForm, severity: value as "low" | "medium" | "high" | "critical"})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isCommon" className="text-right">
                Häufig vorkommend
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <input
                  type="checkbox"
                  id="isCommon"
                  checked={issueForm.isCommon}
                  onChange={(e) => setIssueForm({...issueForm, isCommon: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Dieser Fehler tritt häufig auf</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Beschreibung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="description"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Beschreibung des Problems"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="solution" className="text-right pt-2">
                Lösung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="solution"
                  value={issueForm.solution}
                  onChange={(e) => setIssueForm({...issueForm, solution: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Lösungsvorschlag für das Problem"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateIssueOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => handleSubmitCreateIssue()} disabled={!issueForm.title || !issueForm.deviceType}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Bearbeiten eines Fehlereintrags */}
      <Dialog open={isEditIssueOpen} onOpenChange={setIsEditIssueOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Fehlereintrag bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen des Fehlereintrags.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={issueForm.deviceType}
                onValueChange={(value) => setIssueForm({...issueForm, deviceType: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Titel
              </Label>
              <Input
                id="title"
                value={issueForm.title}
                onChange={(e) => setIssueForm({...issueForm, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="severity" className="text-right">
                Schweregrad
              </Label>
              <Select
                value={issueForm.severity}
                onValueChange={(value) => setIssueForm({...issueForm, severity: value as "low" | "medium" | "high" | "critical"})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isCommon" className="text-right">
                Häufig vorkommend
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <input
                  type="checkbox"
                  id="isCommon"
                  checked={issueForm.isCommon}
                  onChange={(e) => setIssueForm({...issueForm, isCommon: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Dieser Fehler tritt häufig auf</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Beschreibung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="description"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Beschreibung des Problems"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="solution" className="text-right pt-2">
                Lösung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="solution"
                  value={issueForm.solution}
                  onChange={(e) => setIssueForm({...issueForm, solution: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Lösungsvorschlag für das Problem"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIssueOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => handleSubmitEditIssue()} disabled={!issueForm.title || !issueForm.deviceType}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


