import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Mail, Smartphone, Key, Copy, AlertTriangle, CheckCircle } from "lucide-react";
import { useTwoFA } from "@/hooks/use-two-fa";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Schema für Code-Verifizierung
const verifyCodeSchema = z.object({
  code: z.string().min(6, "Code muss mindestens 6 Zeichen haben").max(8, "Code darf maximal 8 Zeichen haben"),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

/**
 * 2FA Setup und Verwaltung Komponente
 * Ermöglicht das Einrichten und Verwalten von Zwei-Faktor-Authentifizierung
 */
export function TwoFASetup() {
  const { 
    twoFAStatus, 
    isLoadingStatus, 
    setup, 
    sendEmailCode, 
    verify, 
    disable,
    isSettingUp, 
    isSendingEmailCode, 
    isVerifying, 
    isDisabling,
    setupResult,
    refetchStatus
  } = useTwoFA();
  
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<"email" | "totp">("email");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const form = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSetup = () => {
    setup({ method: activeMethod });
  };

  const handleSendEmailCode = () => {
    sendEmailCode();
  };

  const onVerifySubmit = (data: VerifyCodeFormData) => {
    verify({ method: activeMethod, code: data.code });
    form.reset();
  };

  const handleDisable = () => {
    if (confirm("Möchten Sie die Zwei-Faktor-Authentifizierung wirklich deaktivieren? Dies reduziert die Sicherheit Ihres Accounts.")) {
      disable();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "In Zwischenablage kopiert",
      description: "Der Text wurde erfolgreich kopiert",
    });
  };

  if (isLoadingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Zwei-Faktor-Authentifizierung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Zwei-Faktor-Authentifizierung
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={twoFAStatus.isEnabled ? "default" : "secondary"}>
            {twoFAStatus.isEnabled ? "Aktiviert" : "Deaktiviert"}
          </Badge>
          {twoFAStatus.methods.email && (
            <Badge variant="outline">
              <Mail className="h-3 w-3 mr-1" />
              E-Mail
            </Badge>
          )}
          {twoFAStatus.methods.totp && (
            <Badge variant="outline">
              <Smartphone className="h-3 w-3 mr-1" />
              Authenticator App
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!twoFAStatus.isEnabled ? (
          <div>
            <Alert className="mb-6">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Erhöhen Sie die Sicherheit Ihres Accounts durch Zwei-Faktor-Authentifizierung. 
                Sie können zwischen E-Mail-Codes und einer Authenticator-App wählen.
              </AlertDescription>
            </Alert>

            <Tabs value={activeMethod} onValueChange={(value) => setActiveMethod(value as "email" | "totp")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-Mail Code
                </TabsTrigger>
                <TabsTrigger value="totp" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Authenticator App
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="email" className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">E-Mail Zwei-Faktor-Authentifizierung</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bei jeder Anmeldung erhalten Sie einen Sicherheitscode per E-Mail, 
                    den Sie zusätzlich zu Ihrem Passwort eingeben müssen.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Einfache Einrichtung - keine zusätzlichen Apps erforderlich</li>
                    <li>• Codes werden an Ihre registrierte E-Mail-Adresse gesendet</li>
                    <li>• Codes sind 10 Minuten gültig</li>
                  </ul>
                </div>
                
                <Button onClick={handleSetup} disabled={isSettingUp} className="w-full">
                  {isSettingUp ? "Richte ein..." : "E-Mail 2FA einrichten"}
                </Button>
              </TabsContent>
              
              <TabsContent value="totp" className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Authenticator App Zwei-Faktor-Authentifizierung</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Verwenden Sie eine Authenticator-App wie Google Authenticator oder Authy 
                    für zeitbasierte Sicherheitscodes.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Höhere Sicherheit durch offline Code-Generierung</li>
                    <li>• Funktioniert auch ohne Internetverbindung</li>
                    <li>• Neue Codes alle 30 Sekunden</li>
                  </ul>
                </div>
                
                <Button onClick={handleSetup} disabled={isSettingUp} className="w-full">
                  {isSettingUp ? "Richte ein..." : "Authenticator 2FA einrichten"}
                </Button>
              </TabsContent>
            </Tabs>

            {setupResult && activeMethod === "totp" && setupResult.qrCode && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Authenticator App einrichten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <img 
                      src={setupResult.qrCode} 
                      alt="QR Code für 2FA Setup" 
                      className="mx-auto mb-4 border rounded"
                    />
                    <p className="text-sm text-muted-foreground mb-4">
                      Scannen Sie diesen QR-Code mit Ihrer Authenticator-App
                    </p>
                  </div>
                  
                  {setupResult.secret && (
                    <div className="bg-muted/50 p-3 rounded">
                      <p className="text-sm font-medium mb-2">Manueller Einrichtungscode:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-background p-2 rounded border">
                          {setupResult.secret}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(setupResult.secret!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onVerifySubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bestätigungscode aus der App</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="6-stelliger Code"
                                className="text-center tracking-wider font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isVerifying} className="w-full">
                        {isVerifying ? "Verifiziere..." : "Code bestätigen"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {setupResult && activeMethod === "email" && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">E-Mail Code verifizieren</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Ein Verifikationscode wurde an Ihre E-Mail-Adresse gesendet. 
                      Bitte geben Sie den Code unten ein.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleSendEmailCode}
                      disabled={isSendingEmailCode}
                    >
                      {isSendingEmailCode ? "Sende..." : "Code erneut senden"}
                    </Button>
                  </div>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onVerifySubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Mail Verifikationscode</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="6-stelliger Code"
                                className="text-center tracking-wider font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isVerifying} className="w-full">
                        {isVerifying ? "Verifiziere..." : "Code bestätigen"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Zwei-Faktor-Authentifizierung ist aktiv und schützt Ihren Account.
              </AlertDescription>
            </Alert>

            {setupResult?.backupCodes && !showBackupCodes && (
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Sie haben Backup-Codes erhalten. Bewahren Sie diese sicher auf.</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowBackupCodes(true)}
                    >
                      Codes anzeigen
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {showBackupCodes && setupResult?.backupCodes && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    Backup-Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-700 mb-4">
                    Diese Codes können nur einmal verwendet werden. Speichern Sie sie an einem sicheren Ort.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {setupResult.backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-white p-2 rounded border">
                          {code}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBackupCodes(false)}
                    className="w-full"
                  >
                    Codes ausblenden
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button 
                variant="destructive" 
                onClick={handleDisable}
                disabled={isDisabling}
              >
                {isDisabling ? "Deaktiviere..." : "2FA deaktivieren"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}