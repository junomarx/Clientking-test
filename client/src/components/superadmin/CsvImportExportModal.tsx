import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Download } from "lucide-react";

interface CsvImportExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'deviceType' | 'brand' | 'model';
  filteredData: any[];
  onImport: (file: File) => void;
  onExport: (data: any[]) => void;
  isImporting: boolean;
}

export default function CsvImportExportModal({
  open,
  onOpenChange,
  type,
  filteredData,
  onImport,
  onExport,
  isImporting
}: CsvImportExportModalProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = () => {
    if (file) {
      onImport(file);
      setFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const handleExport = () => {
    onExport(filteredData);
  };

  const getTypeName = () => {
    switch (type) {
      case 'deviceType': return 'Gerätetypen';
      case 'brand': return 'Hersteller';
      case 'model': return 'Modelle';
      default: return 'Einträge';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>CSV Import/Export - {getTypeName()}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* CSV Import */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">CSV Import</h3>
            <div className="space-y-3">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="w-full"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Datei: {file.name}
                </p>
              )}
              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importiere...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import starten
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* CSV Export */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">CSV Export</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Exportiert alle gefilterten {getTypeName()} als CSV-Datei.
              </p>
              <p className="text-sm font-medium">
                {filteredData.length} Einträge verfügbar
              </p>
              <Button
                onClick={handleExport}
                disabled={filteredData.length === 0}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportieren ({filteredData.length} Einträge)
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}