import React from 'react';
import { LogoUpload } from '@/components/ui/logo-upload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TestUpload() {
  console.log('TestUpload-Komponente wird gerendert');
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Logo-Upload Testseite</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Firmenlogo</CardTitle>
          <CardDescription>Laden Sie Ihr Firmenlogo hoch. Dieses erscheint auf Quittungen und Dokumenten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogoUpload />
        </CardContent>
      </Card>
      
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
        <strong>Test-Info:</strong> Diese Seite dient nur zum Testen des Logo-Uploads.
      </div>
    </div>
  );
}
