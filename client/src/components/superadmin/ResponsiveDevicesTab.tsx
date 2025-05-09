import React, { useState } from "react";
import { useMediaQuery } from '@/hooks/use-media-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Search, Filter, AlertCircle, Smartphone, Tablet, Laptop, Watch, Gamepad2, X, Factory, Layers, RefreshCcw, Upload, FileUp, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import OptimizedDevicesTable from "./OptimizedDevicesTable";

// Diese Komponente wird als neuer Tab im SuperadminDevicesTab verwendet
// Sie nutzt die entwickelte OptimizedDevicesTable für bessere Mobilansicht

export default function ResponsiveDevicesTab() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // State für aktiven Tab
  const [activeTab, setActiveTab] = useState("types");
  
  // Beispieldaten (im echten Code würden diese über useQuery geladen)
  const deviceTypes = [
    { id: 1, name: "Smartphone", userId: 10, shopId: 1682 },
    { id: 2, name: "Tablet", userId: 10, shopId: 1682 },
    { id: 3, name: "Laptop", userId: 10, shopId: 1682 },
    { id: 4, name: "Smartwatch", userId: 10, shopId: 1682 },
    { id: 5, name: "Spielekonsole", userId: 10, shopId: 1682 },
  ];
  
  const brands = [
    { id: 1, name: "Apple", deviceTypeId: 1, deviceTypeName: "Smartphone", userId: 10, shopId: 1682 },
    { id: 2, name: "Samsung", deviceTypeId: 1, deviceTypeName: "Smartphone", userId: 10, shopId: 1682 },
    { id: 3, name: "Huawei", deviceTypeId: 1, deviceTypeName: "Smartphone", userId: 10, shopId: 1682 },
    { id: 4, name: "Apple", deviceTypeId: 2, deviceTypeName: "Tablet", userId: 10, shopId: 1682 },
    { id: 5, name: "Sony", deviceTypeId: 5, deviceTypeName: "Spielekonsole", userId: 10, shopId: 1682 },
  ];
  
  const models = [
    { id: 1, name: "iPhone 15", brandId: 1, brandName: "Apple", deviceTypeName: "Smartphone", userId: 10, shopId: 1682 },
    { id: 2, name: "Galaxy S24", brandId: 2, brandName: "Samsung", deviceTypeName: "Smartphone", userId: 10, shopId: 1682 },
    { id: 3, name: "iPad Pro", brandId: 4, brandName: "Apple", deviceTypeName: "Tablet", userId: 10, shopId: 1682 },
    { id: 4, name: "PlayStation 5", brandId: 5, brandName: "Sony", deviceTypeName: "Spielekonsole", userId: 10, shopId: 1682 },
  ];
  
  // State für Selektionen
  const [selectedDeviceTypeIds, setSelectedDeviceTypeIds] = useState<number[]>([]);
  const [deviceTypeSearchTerm, setDeviceTypeSearchTerm] = useState("");
  
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [selectedBrandDeviceType, setSelectedBrandDeviceType] = useState<string | null>(null);
  
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  const [selectedModelDeviceType, setSelectedModelDeviceType] = useState<string | null>(null);
  const [selectedModelBrandId, setSelectedModelBrandId] = useState<number | null>(null);
  
  // Filter-Funktionen
  const filteredDeviceTypes = deviceTypes.filter(type => 
    type.name.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase())
  );
  
  const filteredBrands = brands.filter(brand => {
    const nameMatches = brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase());
    const typeMatches = !selectedBrandDeviceType || brand.deviceTypeName === selectedBrandDeviceType;
    return nameMatches && typeMatches;
  });
  
  const filteredModels = models.filter(model => {
    const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
    const typeMatches = !selectedModelDeviceType || model.deviceTypeName === selectedModelDeviceType;
    const brandMatches = !selectedModelBrandId || model.brandId === selectedModelBrandId;
    return nameMatches && typeMatches && brandMatches;
  });
  
  // Handler-Funktionen
  const handleSelectDeviceType = (id: number) => {
    setSelectedDeviceTypeIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(typeId => typeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleSelectAllDeviceTypes = (selected: boolean) => {
    if (selected) {
      setSelectedDeviceTypeIds(filteredDeviceTypes.map(type => type.id));
    } else {
      setSelectedDeviceTypeIds([]);
    }
  };
  
  const handleDeleteDeviceType = (id: number) => {
    toast({
      title: "Demo-Modus",
      description: `Gerätetyp mit ID ${id} würde gelöscht werden.`,
    });
  };
  
  const handleBulkDeleteDeviceTypes = () => {
    toast({
      title: "Demo-Modus",
      description: `${selectedDeviceTypeIds.length} Gerätetypen würden gelöscht werden.`,
    });
    setSelectedDeviceTypeIds([]);
  };
  
  const handleSelectBrand = (id: number) => {
    setSelectedBrandIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(brandId => brandId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleSelectAllBrands = (selected: boolean) => {
    if (selected) {
      setSelectedBrandIds(filteredBrands.map(brand => brand.id));
    } else {
      setSelectedBrandIds([]);
    }
  };
  
  const handleDeleteBrand = (id: number) => {
    toast({
      title: "Demo-Modus",
      description: `Hersteller mit ID ${id} würde gelöscht werden.`,
    });
  };
  
  const handleBulkDeleteBrands = () => {
    toast({
      title: "Demo-Modus",
      description: `${selectedBrandIds.length} Hersteller würden gelöscht werden.`,
    });
    setSelectedBrandIds([]);
  };
  
  const handleSelectModel = (id: number) => {
    setSelectedModelIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(modelId => modelId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleSelectAllModels = (selected: boolean) => {
    if (selected) {
      setSelectedModelIds(filteredModels.map(model => model.id));
    } else {
      setSelectedModelIds([]);
    }
  };
  
  const handleDeleteModel = (id: number) => {
    toast({
      title: "Demo-Modus",
      description: `Modell mit ID ${id} würde gelöscht werden.`,
    });
  };
  
  const handleBulkDeleteModels = () => {
    toast({
      title: "Demo-Modus",
      description: `${selectedModelIds.length} Modelle würden gelöscht werden.`,
    });
    setSelectedModelIds([]);
  };
  
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Responsive Geräteverwaltung</h1>
        <p className="text-sm text-gray-500">
          Eine optimierte Darstellung für mobile Endgeräte
        </p>
      </div>
      
      {/* Mobile view: Select dropdown für Tabs */}
      <div className="block md:hidden mb-4">
        <Select 
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Bereich auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="types">Gerätetypen</SelectItem>
            <SelectItem value="brands">Hersteller</SelectItem>
            <SelectItem value="models">Modelle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Desktop view: Tabs */}
      <div className="hidden md:block">
        <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="types">Gerätetypen</TabsTrigger>
            <TabsTrigger value="brands">Hersteller</TabsTrigger>
            <TabsTrigger value="models">Modelle</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {activeTab === "types" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Gerätetypen</h2>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Hinzufügen
            </Button>
          </div>
          
          <OptimizedDevicesTable
            data={filteredDeviceTypes}
            type="deviceType"
            selectedIds={selectedDeviceTypeIds}
            onSelect={handleSelectDeviceType}
            onSelectAll={handleSelectAllDeviceTypes}
            onDelete={handleDeleteDeviceType}
            onBulkDelete={handleBulkDeleteDeviceTypes}
            searchTerm={deviceTypeSearchTerm}
            onSearchChange={setDeviceTypeSearchTerm}
          />
        </div>
      )}
      
      {activeTab === "brands" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Hersteller</h2>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Hinzufügen
            </Button>
          </div>
          
          <OptimizedDevicesTable
            data={filteredBrands}
            type="brand"
            selectedIds={selectedBrandIds}
            onSelect={handleSelectBrand}
            onSelectAll={handleSelectAllBrands}
            onDelete={handleDeleteBrand}
            onBulkDelete={handleBulkDeleteBrands}
            deviceTypes={deviceTypes}
            searchTerm={brandSearchTerm}
            onSearchChange={setBrandSearchTerm}
            selectedDeviceType={selectedBrandDeviceType}
            onDeviceTypeChange={setSelectedBrandDeviceType}
          />
        </div>
      )}
      
      {activeTab === "models" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Modelle</h2>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Hinzufügen
            </Button>
          </div>
          
          <OptimizedDevicesTable
            data={filteredModels}
            type="model"
            selectedIds={selectedModelIds}
            onSelect={handleSelectModel}
            onSelectAll={handleSelectAllModels}
            onDelete={handleDeleteModel}
            onBulkDelete={handleBulkDeleteModels}
            deviceTypes={deviceTypes}
            brands={brands}
            searchTerm={modelSearchTerm}
            onSearchChange={setModelSearchTerm}
            selectedDeviceType={selectedModelDeviceType}
            onDeviceTypeChange={setSelectedModelDeviceType}
            selectedBrand={selectedModelBrandId}
            onBrandChange={setSelectedModelBrandId}
          />
        </div>
      )}
    </div>
  );
}