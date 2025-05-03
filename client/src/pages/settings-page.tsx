import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { LogoUpload } from "@/components/ui/logo-upload";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/app")}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Einfacher Settings-Test</h1>
        </div>
      </div>

      <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
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
          <strong>Vereinfachte Version:</strong> Diese Seite dient nur zum Testen des Logo-Uploads.
        </div>
      </div>
    </div>
  );
}
