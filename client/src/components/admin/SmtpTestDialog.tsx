import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  password: string;
  sender: string;
  recipient: string;
}

interface SmtpTestDialogProps {
  open: boolean;
  onClose: () => void;
  initialSettings?: Partial<SmtpSettings>;
}

export function SmtpTestDialog({ open, onClose, initialSettings = {} }: SmtpTestDialogProps) {
  const [settings, setSettings] = useState<SmtpSettings>({
    host: initialSettings.host || 'smtp.world4you.com',
    port: initialSettings.port || '587',
    user: initialSettings.user || '',
    password: initialSettings.password || '',
    sender: initialSettings.sender || 'Handyshop Verwaltung',
    recipient: initialSettings.recipient || '',
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const testMutation = useMutation({
    mutationFn: async (testSettings: SmtpSettings) => {
      // Verwende den normalen Benutzer-Endpunkt statt des Admin-Endpunkts
      const response = await apiRequest('POST', '/api/user-smtp-test', testSettings);
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({
        success: data.success,
        message: data.message,
        details: data.details,
      });
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: `SMTP-Test fehlgeschlagen: ${error.message}`,
        details: error.response,
      });
    }
  });

  // Wir deaktivieren hier das permanente Speichern für normale Benutzer,
  // da wir nur temporäre Tests durchführen wollen
  const saveMutation = useMutation({
    mutationFn: async (saveSettings: SmtpSettings) => {
      // Führe den gleichen Test durch wie beim Testen - normale Benutzer
      // können Einstellungen nicht in der Datenbank speichern
      const response = await apiRequest('POST', '/api/user-smtp-test', saveSettings);
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({
        success: data.success,
        message: "SMTP-Test erfolgreich! (Hinweis: Die Einstellungen wurden nicht dauerhaft gespeichert)",
        details: data.details,
      });
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: `SMTP-Test fehlgeschlagen: ${error.message}`,
        details: error.response,
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTest = () => {
    testMutation.mutate(settings);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const isLoading = testMutation.isPending || saveMutation.isPending;
  const isValid = settings.host && settings.port && settings.user && settings.password && settings.sender && settings.recipient;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>SMTP-Einstellungen testen</DialogTitle>
          <DialogDescription>
            Testen Sie die SMTP-Einstellungen, um sicherzustellen, dass E-Mails korrekt versendet werden können.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                id="host"
                name="host"
                value={settings.host}
                onChange={handleInputChange}
                placeholder="z.B. smtp.world4you.com"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">SMTP Port</Label>
              <Input
                id="port"
                name="port"
                value={settings.port}
                onChange={handleInputChange}
                placeholder="587 (oder 465 für SSL)"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user">SMTP Benutzername</Label>
              <Input
                id="user"
                name="user"
                value={settings.user}
                onChange={handleInputChange}
                placeholder="E-Mail-Adresse"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">SMTP Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={settings.password}
                onChange={handleInputChange}
                placeholder="Passwort"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender">Absendername</Label>
              <Input
                id="sender"
                name="sender"
                value={settings.sender}
                onChange={handleInputChange}
                placeholder="Handyshop Verwaltung"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Test-Empfänger</Label>
              <Input
                id="recipient"
                name="recipient"
                value={settings.recipient}
                onChange={handleInputChange}
                placeholder="Ihre E-Mail-Adresse"
                disabled={isLoading}
              />
            </div>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <AlertTitle>{testResult.success ? "Erfolg" : "Fehler"}</AlertTitle>
              <AlertDescription className="max-w-full whitespace-normal break-words">
                {testResult.message}
                {testResult.details && (
                  <pre className="mt-2 text-xs overflow-x-auto p-2 bg-muted text-muted-foreground rounded">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          <div>
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Abbrechen
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={!isValid || isLoading}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Einstellungen Speichern"
              )}
            </Button>
            <Button
              onClick={handleTest}
              disabled={!isValid || isLoading}
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Teste...
                </>
              ) : (
                "Test E-Mail Senden"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}