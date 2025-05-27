import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface SecretStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecretStatsDialog({ isOpen, onClose }: SecretStatsDialogProps) {
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Das geheime Passwort - können Sie später ändern
  const SECRET_PASSWORD = 'stats2025';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);

    // Kurze Verzögerung für realistisches Verhalten
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === SECRET_PASSWORD) {
      toast({
        title: "Zugriff gewährt!",
        description: "Sie werden zu den Statistiken weitergeleitet.",
      });
      onClose();
      setPassword('');
      // Zur Statistik-Seite weiterleiten
      setLocation('/app?tab=statistics');
    } else {
      toast({
        title: "Zugriff verweigert",
        description: "Falsches Passwort eingegeben.",
        variant: "destructive",
      });
      setPassword('');
    }
    setIsChecking(false);
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Statistik-Zugriff
          </DialogTitle>
          <DialogDescription>
            Geben Sie das Passwort ein, um auf die Statistiken zuzugreifen.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stats-password">Passwort</Label>
            <Input
              id="stats-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben..."
              disabled={isChecking}
              autoFocus
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isChecking}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isChecking || !password}
              className="flex items-center gap-2"
            >
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              Zugriff prüfen
            </Button>
          </div>
        </form>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
          <strong>Hinweis:</strong> Nur autorisierte Benutzer haben Zugriff auf die Statistiken.
        </div>
      </DialogContent>
    </Dialog>
  );
}