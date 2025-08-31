import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EmailTemplate as DBEmailTemplate } from '@shared/schema';

// Erweiterte EmailTemplate-Schnittstelle für unser UI
interface EmailTemplate extends DBEmailTemplate {
  description?: string;
}

// Komponente für den Email-Template Tab (Read-Only für normale Benutzer)
export function EmailTemplateTab() {
  // Abfrage aller globalen E-Mail-Vorlagen (nur Kunden-Templates für normale Benutzer)
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['/api/email-templates'],
    queryFn: async () => {
      const response = await fetch('/api/email-templates');
      if (!response.ok) throw new Error('Fehler beim Laden der globalen E-Mail-Vorlagen');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Lade E-Mail-Vorlagen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
              <p className="text-muted-foreground">
                Die E-Mail-Vorlagen konnten nicht geladen werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info-Box über zentrale Verwaltung */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Zentrale E-Mail-Vorlagen</h4>
              <p className="text-sm text-blue-800">
                Alle E-Mail-Templates werden jetzt zentral über den Superadmin-Bereich verwaltet. 
                Diese Vorlagen werden automatisch für alle Status-Updates und Benachrichtigungen verwendet.
              </p>
              <p className="text-sm text-blue-700 mt-2 font-medium">
                💡 Änderungen an den Templates können nur vom Superadmin vorgenommen werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Verfügbare E-Mail-Vorlagen
          </CardTitle>
          <CardDescription>
            Diese globalen Templates werden für Kunden-E-Mails verwendet. Sie sind für alle Shops einheitlich.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Betreff</TableHead>
                  <TableHead>Variablen</TableHead>
                  <TableHead>Zuletzt aktualisiert</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template: EmailTemplate) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {template.variables && Array.isArray(template.variables) && template.variables.length > 0 ? (
                          template.variables.slice(0, 3).map((variable: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Keine Variablen</span>
                        )}
                        {template.variables && Array.isArray(template.variables) && template.variables.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 3} weitere
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(template.updatedAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Anzeigen
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{template.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="font-semibold text-sm">Betreff:</label>
                              <p className="mt-1 p-2 bg-gray-50 rounded border">{template.subject}</p>
                            </div>
                            
                            {template.variables && Array.isArray(template.variables) && template.variables.length > 0 && (
                              <div>
                                <label className="font-semibold text-sm">Verfügbare Variablen:</label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {template.variables.map((variable: string, index: number) => (
                                    <Badge key={index} variant="secondary">
                                      {`{{${variable}}}`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <label className="font-semibold text-sm">E-Mail-Inhalt:</label>
                              <ScrollArea className="mt-1 h-96 w-full rounded border">
                                <div className="p-4">
                                  <div 
                                    dangerouslySetInnerHTML={{ __html: template.body }} 
                                    className="prose prose-sm max-w-none"
                                  />
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine E-Mail-Vorlagen gefunden</h3>
              <p className="text-muted-foreground">
                Es sind noch keine globalen E-Mail-Vorlagen verfügbar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}