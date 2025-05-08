import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DeviceTypeSettings } from './DeviceTypeSettings';
import { BrandSettings } from './BrandSettings';
import { ModelManagementTab } from './ModelManagementTab';
import { Smartphone, Layers, Tag, Download, Upload, Database } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export function DeviceManagementTab() {
  const [activeTab, setActiveTab] = useState("deviceTypes");
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();
  
  const canManageDevices = user?.isAdmin || false;
  
  // Funktion zum Exportieren der Gerätedaten
  const handleExportDeviceData = async () => {
    try {
      setIsExporting(true);
      
      // API-Anfrage zum Exportieren der Daten
      const response = await apiRequest('GET', '/api/admin/device-management/export');
      if (!response.ok) {
        throw new Error('Fehler beim Exportieren der Daten');
      }
      
      // Daten als JSON herunterladen
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      // Download-Link erstellen und klicken
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export erfolgreich",
        description: "Die Gerätedaten wurden erfolgreich exportiert."
      });
    } catch (error) {
      console.error("Fehler beim Exportieren der Gerätedaten:", error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Die Gerätedaten konnten nicht exportiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Datei-Auswahl-Dialog öffnen
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Funktion zum Importieren der Gerätedaten
  const handleImportDeviceData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      
      // Datei einlesen
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Daten importieren
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/admin/device-management/import', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Fehler beim Importieren der Daten');
          }
          
          // Cache invalidieren
          queryClient.invalidateQueries({ queryKey: ["/api/device-types"] });
          queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
          queryClient.invalidateQueries({ queryKey: ["/api/models"] });
          queryClient.invalidateQueries({ queryKey: ["/api/device-issues"] });
          
          toast({
            title: "Import erfolgreich",
            description: "Die Gerätedaten wurden erfolgreich importiert."
          });
        } catch (error) {
          console.error("Fehler beim Verarbeiten der Import-Datei:", error);
          toast({
            title: "Import fehlgeschlagen",
            description: error instanceof Error ? error.message : "Die Gerätedaten konnten nicht importiert werden.",
            variant: "destructive"
          });
        } finally {
          setIsImporting(false);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Fehler beim Importieren der Gerätedaten:", error);
      toast({
        title: "Import fehlgeschlagen",
        description: "Die Gerätedaten konnten nicht importiert werden.",
        variant: "destructive"
      });
      setIsImporting(false);
      
      // Zurücksetzen des Datei-Inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-md shadow-sm p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Globale Geräteverwaltung</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Zentrale Verwaltung für alle Gerätetypen, Herstellern und Modellreihen
        </p>
        
        {canManageDevices && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 w-full sm:w-auto" 
              onClick={handleExportDeviceData}
              disabled={isExporting}
            >
              {isExporting ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Daten exportieren
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 w-full sm:w-auto" 
              onClick={handleImportClick}
              disabled={isImporting}
            >
              {isImporting ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Daten importieren
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleImportDeviceData}
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <Button
            variant={activeTab === "deviceTypes" ? "default" : "outline"}
            className={`p-3 h-auto justify-start ${activeTab === "deviceTypes" ? "bg-primary text-white" : "bg-secondary/10"}`}
            onClick={() => setActiveTab("deviceTypes")}
          >
            <Smartphone className="h-4 w-4 mr-2" /> Gerätetypen
          </Button>
          
          <Button
            variant={activeTab === "brands" ? "default" : "outline"}
            className={`p-3 h-auto justify-start ${activeTab === "brands" ? "bg-primary text-white" : "bg-secondary/10"}`}
            onClick={() => setActiveTab("brands")}
          >
            <Tag className="h-4 w-4 mr-2" /> Herstellern
          </Button>
          
          <Button
            variant={activeTab === "models" ? "default" : "outline"}
            className={`p-3 h-auto justify-start ${activeTab === "models" ? "bg-primary text-white" : "bg-secondary/10"}`}
            onClick={() => setActiveTab("models")}
          >
            <Layers className="h-4 w-4 mr-2" /> Modelle
          </Button>
          

        </div>
        
        <div className="bg-white rounded-md shadow-sm border p-4">
          {activeTab === "deviceTypes" && <DeviceTypeSettings />}
          {activeTab === "brands" && <BrandSettings />}
          {activeTab === "models" && <ModelManagementTab />}
        </div>
      </div>
    </div>
  );
}