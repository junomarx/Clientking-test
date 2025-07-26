import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit, User, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';

interface Employee {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  parentUserId: number;
  createdAt: string;
}

interface NewEmployeeForm {
  password: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function EmployeesPage() {
  const [isNewEmployeeDialogOpen, setIsNewEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployeeForm, setNewEmployeeForm] = useState<NewEmployeeForm>({
    password: '',
    email: '',
    firstName: '',
    lastName: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Bestimme Benutzerrolle (Shop-Owner vs. Mitarbeiter)
  const userRole = (user?.role === 'admin' || user?.role === 'owner') ? 'owner' : 'employee';

  // Mitarbeiter abrufen
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employees');
      return response.json();
    }
  });

  // Geschäftseinstellungen für Mitarbeiterlimit abrufen
  const { data: businessSettings } = useQuery<any>({
    queryKey: ['/api/business-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/business-settings');
      return response.json();
    }
  });

  // Neuen Mitarbeiter erstellen
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: NewEmployeeForm) => {
      const response = await apiRequest('POST', '/api/employees', employeeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsNewEmployeeDialogOpen(false);
      setNewEmployeeForm({
        password: '',
        email: '',
        firstName: '',
        lastName: ''
      });
      toast({
        title: "Mitarbeiter erstellt",
        description: "Der neue Mitarbeiter wurde erfolgreich angelegt.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Mitarbeiters",
        variant: "destructive",
      });
    },
  });

  // Mitarbeiter Status ändern
  const updateEmployeeStatusMutation = useMutation({
    mutationFn: async ({ employeeId, isActive }: { employeeId: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/employees/${employeeId}/status`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Status aktualisiert",
        description: "Der Mitarbeiterstatus wurde geändert.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Status",
        variant: "destructive",
      });
    },
  });

  // Mitarbeiter löschen
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      await apiRequest('DELETE', `/api/employees/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Mitarbeiter gelöscht",
        description: "Der Mitarbeiter wurde erfolgreich entfernt.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Mitarbeiters",
        variant: "destructive",
      });
    },
  });

  const handleCreateEmployee = () => {
    if (!newEmployeeForm.password || !newEmployeeForm.email || !newEmployeeForm.firstName || !newEmployeeForm.lastName) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }
    
    createEmployeeMutation.mutate(newEmployeeForm);
  };

  const handleStatusToggle = (employeeId: number, currentStatus: boolean) => {
    updateEmployeeStatusMutation.mutate({
      employeeId,
      isActive: !currentStatus
    });
  };

  const handleDeleteEmployee = (employeeId: number, employeeName: string) => {
    if (window.confirm(`Möchten Sie den Mitarbeiter "${employeeName}" wirklich löschen?`)) {
      deleteEmployeeMutation.mutate(employeeId);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Mitarbeiter werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - responsive für mobile Geräte */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mitarbeiterverwaltung</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Verwalten Sie die Mitarbeiter Ihres Geschäfts
          </p>
          {businessSettings && (
            <p className="text-sm text-gray-600 mt-1">
              Sie können noch {Math.max(0, (businessSettings.maxEmployees || 2) - employees.length)} Mitarbeiter hinzufügen
            </p>
          )}
        </div>
        <Button 
          onClick={() => setIsNewEmployeeDialogOpen(true)}
          className="w-full sm:w-auto"
          disabled={businessSettings && employees.length >= (businessSettings.maxEmployees || 2)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Mitarbeiter
        </Button>
      </div>

      {/* Mitarbeiter-Liste - responsive Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.id} className="relative">
            <CardHeader className="pb-3">
              {/* Mobile-optimierter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <CardTitle className="text-base md:text-lg truncate">
                    {employee.firstName} {employee.lastName}
                  </CardTitle>
                </div>
                <Badge 
                  variant={employee.isActive ? "default" : "secondary"}
                  className="self-start sm:self-center"
                >
                  {employee.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* E-Mail mit Umbruch für mobile Geräte */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-sm">
                  <div className="flex items-center space-x-2 mb-1 sm:mb-0">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">E-Mail:</span>
                  </div>
                  <span className="text-muted-foreground break-all sm:break-normal">
                    {employee.email}
                  </span>
                </div>
              </div>

              {/* Actions - mobile-optimiert */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={employee.isActive}
                    onCheckedChange={() => handleStatusToggle(employee.id, employee.isActive)}
                    disabled={updateEmployeeStatusMutation.isPending}
                  />
                  <Label className="text-sm">
                    {employee.isActive ? "Aktiv" : "Inaktiv"}
                  </Label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditEmployee(employee)}
                    disabled={updateEmployeeStatusMutation.isPending}
                    className="text-primary hover:text-primary"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Bearbeiten</span>
                  </Button>
                  {userRole === 'owner' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee.id, `${employee.firstName} ${employee.lastName}`)}
                      disabled={deleteEmployeeMutation.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Löschen</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Mitarbeiter</h3>
            <p className="text-muted-foreground text-center mb-4">
              Sie haben noch keine Mitarbeiter angelegt. 
              Erstellen Sie Ihren ersten Mitarbeiter, um loszulegen.
            </p>
            <Button onClick={() => setIsNewEmployeeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Mitarbeiter erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Neuer Mitarbeiter Dialog */}
      <Dialog open={isNewEmployeeDialogOpen} onOpenChange={setIsNewEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Neuen Mitarbeiter erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <Input
                  id="firstName"
                  value={newEmployeeForm.firstName}
                  onChange={(e) => setNewEmployeeForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  value={newEmployeeForm.lastName}
                  onChange={(e) => setNewEmployeeForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Mustermann"
                />
              </div>
            </div>
            

            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={newEmployeeForm.email}
                onChange={(e) => setNewEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="max.mustermann@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={newEmployeeForm.password}
                onChange={(e) => setNewEmployeeForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Sicheres Passwort"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleCreateEmployee}
                disabled={createEmployeeMutation.isPending}
                className="w-full sm:flex-1"
              >
                {createEmployeeMutation.isPending ? "Wird erstellt..." : "Erstellen"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsNewEmployeeDialogOpen(false)}
                className="w-full sm:flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        open={isEditEmployeeDialogOpen}
        onOpenChange={setIsEditEmployeeDialogOpen}
        employee={selectedEmployee}
        userRole={userRole}
      />
    </div>
  );
}