import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  allowedFileTypes = ['image/*'],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size check
    if (file.size > maxFileSize) {
      alert(`Datei ist zu groß. Maximum: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    try {
      setUploading(true);
      
      // Get upload URL
      const { url } = await onGetUploadParameters();
      
      // Upload file
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (response.ok) {
        // Call completion callback
        onComplete?.({
          successful: [{
            uploadURL: url,
            name: file.name,
            type: file.type,
            size: file.size
          }]
        });
      } else {
        throw new Error('Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('Upload-Fehler:', error);
      alert('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <Button 
        onClick={handleButtonClick} 
        className={buttonClassName}
        disabled={uploading}
      >
        {uploading ? 'Hochladen...' : children}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedFileTypes?.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        multiple={maxNumberOfFiles > 1}
      />
    </div>
  );
}