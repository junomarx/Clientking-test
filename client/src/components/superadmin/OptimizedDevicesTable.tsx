import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Trash2, Smartphone, Tablet, Laptop, Watch, GamepadIcon, X } from "lucide-react";
import MobileDeviceList from '@/components/MobileDeviceList';

// Interfaces für die Datentypen
interface DeviceType {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  deviceTypeName?: string;
  userId: number;
  shopId: number;
}

interface Model {
  id: number;
  name: string;
  brandId: number;
  deviceTypeName?: string;
  brandName?: string;
  userId: number;
  shopId: number;
}

interface OptimizedDevicesTableProps {
  data: Brand[] | Model[] | DeviceType[];
  type: 'deviceType' | 'brand' | 'model';
  selectedIds: number[];
  onSelect: (id: number) => void;
  onSelectAll: (selected: boolean) => void;
  onDelete: (id: number) => void;
  onBulkDelete: () => void;
  deviceTypes?: DeviceType[];
  brands?: Brand[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDeviceType?: string | null;
  onDeviceTypeChange?: (value: string) => void;
  selectedBrand?: number | null;
  onBrandChange?: (value: number) => void;
}

export default function OptimizedDevicesTable({
  data,
  type,
  selectedIds,
  onSelect,
  onSelectAll,
  onDelete,
  onBulkDelete,
  deviceTypes = [],
  brands = [],
  searchTerm,
  onSearchChange,
  selectedDeviceType,
  onDeviceTypeChange,
  selectedBrand,
  onBrandChange
}: OptimizedDevicesTableProps) {
  // Prüfe, ob wir auf einem mobilen Gerät sind
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // Status für "alle auswählen"
  const [selectAll, setSelectAll] = useState(false);
  
  // Hilfsfunktion zum Anzeigen von Icons für Gerätetypen
  const getDeviceTypeIcon = (typeName?: string) => {
    const iconProps = { className: "h-5 w-5 text-primary" };
    
    if (!typeName) {
      return <Smartphone {...iconProps} />;
    }
    
    const type = typeName.toLowerCase();
    
    if (type === "smartphone") {
      return <Smartphone {...iconProps} />;
    } else if (type === "tablet") {
      return <Tablet {...iconProps} />;
    } else if (type === "laptop") {
      return <Laptop {...iconProps} />;
    } else if (type === "watch" || type === "smartwatch") {
      return <Watch {...iconProps} />;
    } else if (type === "spielekonsole" || type === "konsole" || type === "game console" || type === "gameconsole") {
      return <GamepadIcon {...iconProps} />;
    } else {
      return <Smartphone {...iconProps} />;
    }
  };
  
  // Hilfsfunktion zum Rendern der Filterleiste
  const renderFilterBar = () => {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={type === 'deviceType' ? "Gerätetyp suchen..." : type === 'brand' ? "Hersteller suchen..." : "Modell suchen..."}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {(type === 'brand' || type === 'model') && onDeviceTypeChange && deviceTypes.length > 0 && (
          <Select value={selectedDeviceType || "all"} onValueChange={onDeviceTypeChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Alle Gerätetypen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Gerätetypen</SelectItem>
              {deviceTypes.filter(type => type && typeof type === 'string' && type.trim() !== "").map((deviceType) => (
                <SelectItem key={deviceType} value={deviceType}>
                  <div className="flex items-center">
                    {getDeviceTypeIcon(deviceType)}
                    <span className="ml-2">{deviceType}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {type === 'model' && onBrandChange && brands.length > 0 && (
          <Select 
            value={selectedBrand?.toString() || "all"}
            onValueChange={(value) => onBrandChange(value === "all" ? 0 : parseInt(value))}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Alle Hersteller" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Hersteller</SelectItem>
              {brands.filter(brand => !selectedDeviceType || selectedDeviceType === "all" || brand.deviceTypeName === selectedDeviceType).map((brand) => (
                <SelectItem key={brand.id} value={brand.id.toString()}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };
  
  // Hilfsfunktion zum Rendern der Auswahlleiste (wenn Elemente ausgewählt sind)
  const renderSelectionBar = () => {
    if (selectedIds.length === 0) return null;
    
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">
            {selectedIds.length} ausgewählt
          </Badge>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setSelectAll(false);
              onSelectAll(false);
            }}
          >
            <X className="h-4 w-4 mr-1" /> Auswahl aufheben
          </Button>
        </div>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={onBulkDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Ausgewählte löschen
        </Button>
      </div>
    );
  };
  
  // Rendert die Tabelle für Desktop-Ansicht
  const renderTable = () => {
    if (type === 'deviceType') {
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap w-[40px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => {
                      setSelectAll(!!checked);
                      onSelectAll(!!checked);
                    }}
                    aria-label="Alle auswählen"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Name</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px]">Icon</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px]">Shop ID</TableHead>
                <TableHead className="text-right whitespace-nowrap min-w-[80px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => onSelect(item.id)}
                      aria-label={`${item.name} auswählen`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{getDeviceTypeIcon(item.name)}</TableCell>
                  <TableCell>{item.shopId || 1682}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    } else if (type === 'brand') {
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap w-[40px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => {
                      setSelectAll(!!checked);
                      onSelectAll(!!checked);
                    }}
                    aria-label="Alle Hersteller auswählen"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Hersteller</TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Gerätetyp</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px]">Shop ID</TableHead>
                <TableHead className="text-right whitespace-nowrap min-w-[80px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((brand: any) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(brand.id)}
                      onCheckedChange={() => onSelect(brand.id)}
                      aria-label={`Hersteller ${brand.name} auswählen`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="flex items-center space-x-2">
                    {getDeviceTypeIcon(brand.deviceTypeName || 'Smartphone')}
                    <span>{brand.deviceTypeName || 'Smartphone'}</span>
                  </TableCell>
                  <TableCell>{brand.shopId}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(brand.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    } else {
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap w-[40px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => {
                      setSelectAll(!!checked);
                      onSelectAll(!!checked);
                    }}
                    aria-label="Alle Modelle auswählen"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Modell</TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Hersteller</TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Gerätetyp</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px]">Shop ID</TableHead>
                <TableHead className="text-right whitespace-nowrap min-w-[80px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((model: any) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(model.id)}
                      onCheckedChange={() => onSelect(model.id)}
                      aria-label={`Modell ${model.name} auswählen`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell>{model.brandName}</TableCell>
                  <TableCell className="flex items-center space-x-2">
                    {getDeviceTypeIcon(model.deviceTypeName || 'Smartphone')}
                    <span>{model.deviceTypeName || 'Smartphone'}</span>
                  </TableCell>
                  <TableCell>{model.shopId}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(model.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
  };
  
  // Rendert die mobile Ansicht mit MobileDeviceList
  const renderMobileView = () => {
    // Funktions, um den Gerätetyp-Namen für ein Element zu bekommen
    const getDeviceTypeName = (item: any) => {
      if (type === 'deviceType') {
        return item.name;
      } else if (type === 'brand') {
        return item.deviceTypeName || 'Smartphone';
      } else {
        return item.deviceTypeName || 'Smartphone';
      }
    };
    
    return (
      <MobileDeviceList 
        items={data as any}
        type={type}
        onSelect={(item: any) => {}}
        onCheckboxChange={(id: number, checked: boolean) => onSelect(id)}
        selectedIds={selectedIds}
        showCheckboxes={true}
        getDeviceTypeName={getDeviceTypeName}
      />
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        {renderFilterBar()}
        {renderSelectionBar()}
        
        {data.length > 0 ? (
          isMobile ? renderMobileView() : renderTable()
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Filter className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Keine Ergebnisse gefunden</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              {searchTerm || selectedDeviceType || selectedBrand
                ? 'Keine Ergebnisse für Ihre Suche.'
                : `Es wurden keine ${type === 'deviceType' ? 'Gerätetypen' : type === 'brand' ? 'Hersteller' : 'Modelle'} gefunden.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}