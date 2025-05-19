import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Send, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  password: string;
  sender: string;
  recipient: string;
}

interface UserSmtpTestDialogProps {
  open: boolean;
  onClose: () => void;
  initialSettings?: Partial<SmtpSettings>;
}

export function UserSmtpTestDialog({ open, onClose, initialSettings = {} }: UserSmtpTestDialogProps) {
  const [settings, setSettings] = useState<SmtpSettings>({
    host: initialSettings.host || '',
    port: initialSettings.port || '587',
    user: initialSettings.user || '',
    password: initialSettings.password || '',
    sender: initialSettings.sender || '',
    recipient: initialSettings.recipient || '',
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation zum manuellen Speichern der SMTP-Einstellungen
  const saveMutation = useMutation({
    mutationFn: async (saveSettings: SmtpSettings) => {
      const response = await apiRequest('POST', '/api/business-settings', {
        smtpHost: saveSettings.host,
        smtpPort: saveSettings.port,
        smtpUser: saveSettings.user,
        smtpPassword: saveSettings.password,
        smtpSenderName: saveSettings.sender
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-settings'] });
      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre SMTP-Einstellungen wurden erfolgreich gespeichert.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Speichern",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (testSettings: SmtpSettings) => {
      // Verwende den neuen API-Endpunkt für SMTP-Test mit automatischem Speichern
      const response = await apiRequest('POST', '/api/user-smtp-test-auto-save', testSettings);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>SMTP-Verbindung testen</DialogTitle>
          <DialogDescription>
            Testen Sie Ihre SMTP-Einstellungen, um sicherzustellen, dass E-Mails korrekt versendet werden können.
            Bei erfolgreichem Test werden diese Einstellungen automatisch in Ihren Geschäftseinstellungen gespeichert.
            Falls die automatische Speicherung nicht funktioniert, können Sie nach dem erfolgreichen Test die "SMTP-Einstellungen speichern"-Schaltfläche verwenden.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">SMTP-Server</Label>
                <Input
                  id="host"
                  name="host"
                  value={settings.host}
                  onChange={handleInputChange}
                  placeholder="smtp.example.com"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  name="port"
                  value={settings.port}
                  onChange={handleInputChange}
                  placeholder="587"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user">Benutzername</Label>
                <Input
                  id="user"
                  name="user"
                  value={settings.user}
                  onChange={handleInputChange}
                  placeholder="user@example.com"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
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
              <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{testResult.success ? "Erfolg" : "Fehler"}</AlertTitle>
                <AlertDescription className="max-w-full break-words">
                  {testResult.message}
                  {testResult.details && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs border p-2 rounded-md bg-secondary/50">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 sm:justify-between gap-2">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isLoading}
          >
            Schließen
          </Button>
          
          <div className="flex gap-2">
            {/* Speichern-Button, aktiviert wenn gültige Einstellungen vorhanden sind */}
            {testResult && testResult.success && (
              <Button
                onClick={handleSave}
                disabled={!isValid || saveMutation.isPending}
                variant="outline"
                className="min-w-[160px]"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    SMTP-Einstellungen speichern
                  </>
                )}
              </Button>
            )}
            
            {/* Test-Button */}
            <Button
              onClick={handleTest}
              disabled={!isValid || isLoading}
              className="min-w-[160px]"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird getestet...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  SMTP-Test starten
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}