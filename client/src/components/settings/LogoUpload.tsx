import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LogoUploadProps {
  onUploadSuccess?: (logoUrl: string) => void;
}

export function LogoUpload({ onUploadSuccess }: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Laden des bestehenden Logos beim ersten Rendern
  useEffect(() => {
    fetchExistingLogo();
  }, []);

  const fetchExistingLogo = async () => {
    try {
      const response = await fetch('/api/business-settings/logo');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl);
          if (onUploadSuccess) {
            onUploadSuccess(data.logoUrl);
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Logos:', error);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validiere die Datei (nur Bilder erlaubt)
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ungültiges Dateiformat',
        description: 'Bitte laden Sie nur Bilder hoch (JPEG, PNG, GIF, etc.).',
        variant: 'destructive',
      });
      return;
    }

    // Validiere die Dateigröße (maximal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Datei zu groß',
        description: 'Die Dateigröße darf maximal 5MB betragen.',
        variant: 'destructive',
      });
      return;
    }

    // Datei hochladen
    const formData = new FormData();
    formData.append('logo', file);

    setIsUploading(true);

    try {
      const response = await fetch('/api/business-settings/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await response.json();

      if (data.success) {
        setLogoUrl(data.logoUrl);
        toast({
          title: 'Logo hochgeladen',
          description: 'Ihr Logo wurde erfolgreich hochgeladen.',
        });

        if (onUploadSuccess) {
          onUploadSuccess(data.logoUrl);
        }
      } else {
        throw new Error(data.message || 'Unbekannter Fehler beim Hochladen');
      }
    } catch (error) {
      console.error('Fehler beim Hochladen des Logos:', error);
      toast({
        title: 'Upload fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler beim Hochladen des Logos',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset das Datei-Input-Feld
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;

    try {
      const response = await fetch('/api/business-settings/logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Löschen fehlgeschlagen');
      }

      const data = await response.json();

      if (data.success) {
        setLogoUrl(null);
        toast({
          title: 'Logo gelöscht',
          description: 'Ihr Logo wurde erfolgreich gelöscht.',
        });

        if (onUploadSuccess) {
          onUploadSuccess('');
        }
      } else {
        throw new Error(data.message || 'Unbekannter Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Logos:', error);
      toast({
        title: 'Löschen fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen des Logos',
        variant: 'destructive',
      });
    }
  };

  // Hinzufügen eines zufälligen Query-Parameters, um Caching zu verhindern
  const logoUrlWithCache = logoUrl ? `${logoUrl}?t=${new Date().getTime()}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center p-4 border rounded-md">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {logoUrl ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img
                src={logoUrlWithCache}
                alt="Firmenlogo"
                className="max-w-[200px] max-h-32 object-contain border rounded p-2"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleDeleteLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Aktuelles Logo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md w-full text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">Kein Logo hochgeladen</p>
          </div>
        )}

        <Button
          onClick={handleUploadClick}
          className="mt-4"
          disabled={isUploading}
        >
          {isUploading ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2">⟳</span> Wird hochgeladen...
            </span>
          ) : (
            <span className="flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              {logoUrl ? 'Logo ändern' : 'Logo hochladen'}
            </span>
          )}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Unterstützte Formate: JPEG, PNG, GIF, WEBP</p>
        <p>Maximale Größe: 5MB</p>
        <p>Empfohlene Auflösung: 500 x 200 Pixel</p>
      </div>
    </div>
  );
}
