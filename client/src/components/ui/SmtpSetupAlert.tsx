import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, Settings, ExternalLink } from 'lucide-react';

interface SmtpSetupAlertProps {
  onOpenSettings?: () => void;
  className?: string;
}

export function SmtpSetupAlert({ onOpenSettings, className }: SmtpSetupAlertProps) {
  return (
    <Alert className={className}>
      <Mail className="h-4 w-4" />
      <AlertTitle>SMTP-Konfiguration erforderlich</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Um E-Mails zu versenden, müssen Sie Ihre SMTP-Einstellungen konfigurieren. 
          Nach der Bereinigung des Systems verwenden wir jetzt ausschließlich Ihre eigenen E-Mail-Server.
        </p>
        
        <div className="space-y-2 text-sm">
          <p><strong>Schnelle Einrichtung:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Gmail: smtp.gmail.com, Port 587 (benötigt App-Passwort)</li>
            <li>Outlook: smtp.live.com, Port 587</li>
            <li>Andere: Fragen Sie Ihren E-Mail-Anbieter</li>
          </ul>
        </div>
        
        <div className="flex gap-2 mt-4">
          {onOpenSettings && (
            <Button onClick={onOpenSettings} size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Einstellungen öffnen
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open('https://support.google.com/accounts/answer/185833', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Gmail App-Passwort Hilfe
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}