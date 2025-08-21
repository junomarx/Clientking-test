import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, Mail, Shield, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';

export default function MultiShopAdminManagement() {
  const [isGrantAccessDialogOpen, setIsGrantAccessDialogOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Multi-Shop-Admin Zugriff gewähren per E-Mail
  const grantAccessMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/multi-shop/grant-access-by-email', { email });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-shop'] });
      setIsGrantAccessDialogOpen(false);
      setAdminEmail('');
      toast({
        title: 'Zugriff gewährt',
        description: `Zugriff wurde erfolgreich für ${data.admin.username} gewährt.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Gewähren des Zugriffs',
        variant: 'destructive',
      });
    },
  });

  const handleGrantAccess = () => {
    if (!adminEmail || !adminEmail.includes('@')) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
        variant: 'destructive',
      });
      return;
    }

    grantAccessMutation.mutate(adminEmail);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Shop-Admin Zugriff gewähren
          </CardTitle>
          <CardDescription>
            Gewähren Sie einem Multi-Shop-Admin Zugriff auf Ihre Shop-Daten. 
            Multi-Shop-Admins können nur vom Superadmin erstellt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>DSGVO-Hinweis:</strong> Aus Datenschutzgründen können Sie keine Liste der verfügbaren Multi-Shop-Admins einsehen. 
              Geben Sie die E-Mail-Adresse des Multi-Shop-Admins ein, dem Sie Zugriff gewähren möchten.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Dialog open={isGrantAccessDialogOpen} onOpenChange={setIsGrantAccessDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full max-w-md">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Multi-Shop-Admin Zugriff gewähren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Multi-Shop-Admin Zugriff gewähren</DialogTitle>
                  <DialogDescription>
                    Geben Sie die E-Mail-Adresse des Multi-Shop-Admins ein, dem Sie Zugriff auf Ihre Shop-Daten gewähren möchten.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-Mail-Adresse des Multi-Shop-Admins
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="multishop.admin@example.com"
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Das System prüft automatisch, ob ein Multi-Shop-Admin mit dieser E-Mail-Adresse existiert.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGrantAccessDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleGrantAccess}
                    disabled={grantAccessMutation.isPending}
                  >
                    {grantAccessMutation.isPending ? 'Prüfe...' : 'Zugriff gewähren'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="text-center py-8 text-muted-foreground border-t">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">Wie funktioniert es?</h3>
            <div className="text-sm space-y-1 max-w-md mx-auto">
              <p>1. Geben Sie die E-Mail-Adresse des Multi-Shop-Admins ein</p>
              <p>2. Das System prüft, ob ein aktiver Multi-Shop-Admin existiert</p>
              <p>3. Bei erfolgreicher Prüfung wird der Zugriff gewährt</p>
              <p className="text-xs text-muted-foreground mt-3">
                Multi-Shop-Admins können nur vom Superadmin erstellt werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}