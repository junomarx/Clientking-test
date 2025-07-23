import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
// Employee interface lokal definiert da nicht in @/lib/types vorhanden
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
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  userRole: 'owner' | 'employee';
}

export function EditEmployeeDialog({ open, onOpenChange, employee, userRole }: EditEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '', // Nur für Passwort-Änderungen
  });
  const [isPasswordChange, setIsPasswordChange] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form mit Mitarbeiter-Daten füllen
  useEffect(() => {
    if (employee && open) {
      setFormData({
        username: employee.username || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        password: '',
      });
      setIsPasswordChange(false);
    }
  }, [employee, open]);

  // Update Mitarbeiter Mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!employee?.id) throw new Error("Mitarbeiter-ID fehlt");
      
      const updateData: any = {};
      
      // Je nach Benutzerrolle verschiedene Felder erlauben
      if (userRole === 'owner') {
        // Owner kann alles außer Passwort ändern
        updateData.username = data.username;
        updateData.firstName = data.firstName;
        updateData.lastName = data.lastName;
        updateData.email = data.email;
      } else {
        // Mitarbeiter kann nur Passwort ändern
        if (isPasswordChange && data.password) {
          updateData.password = data.password;
        } else {
          throw new Error("Mitarbeiter können nur ihr Passwort ändern");
        }
      }

      const response = await fetch(`/api/employees/${employee.id}/edit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Aktualisieren");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mitarbeiter aktualisiert",
        description: userRole === 'owner' 
          ? "Die Mitarbeiterdaten wurden erfolgreich aktualisiert."
          : "Ihr Passwort wurde erfolgreich geändert.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      onOpenChange(false);
      setFormData(prev => ({ ...prev, password: '' }));
      setIsPasswordChange(false);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Mitarbeiter konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (userRole === 'owner') {
      // Owner muss alle Felder ausfüllen (außer Passwort)
      if (!formData.username || !formData.firstName || !formData.lastName || !formData.email) {
        toast({
          title: "Fehler",
          description: "Bitte füllen Sie alle Felder aus.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Mitarbeiter muss Passwort eingeben
      if (!isPasswordChange || !formData.password) {
        toast({
          title: "Fehler",
          description: "Bitte geben Sie ein neues Passwort ein.",
          variant: "destructive",
        });
        return;
      }
    }

    updateEmployeeMutation.mutate(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData(prev => ({ ...prev, password: '' }));
    setIsPasswordChange(false);
  };

  if (!open || !employee) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {userRole === 'owner' ? 'Mitarbeiter bearbeiten' : 'Meine Einstellungen'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {userRole === 'owner' ? (
            // Owner kann alle Daten bearbeiten
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Max"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="max.mustermann"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="max.mustermann@example.com"
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={updateEmployeeMutation.isPending}
                >
                  {updateEmployeeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </Button>
              </div>
            </>
          ) : (
            // Mitarbeiter kann nur Passwort ändern
            <>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Aktuelle Informationen</h3>
                  <p className="text-sm text-muted-foreground">Name: {employee.firstName} {employee.lastName}</p>
                  <p className="text-sm text-muted-foreground">Benutzername: {employee.username}</p>
                  <p className="text-sm text-muted-foreground">E-Mail: {employee.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Diese Daten können nur vom Shop-Owner geändert werden.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="passwordChange"
                      checked={isPasswordChange}
                      onChange={(e) => setIsPasswordChange(e.target.checked)}
                    />
                    <Label htmlFor="passwordChange">Passwort ändern</Label>
                  </div>
                  
                  {isPasswordChange && (
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Neues Passwort eingeben"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={updateEmployeeMutation.isPending || !isPasswordChange}
                >
                  {updateEmployeeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    'Passwort ändern'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}