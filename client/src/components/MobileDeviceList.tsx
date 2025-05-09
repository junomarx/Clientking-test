import React from 'react';
import { 
  Card,
  CardContent,
} from '@/components/ui/card';
import { Smartphone, Tablet, Laptop, Watch, GamepadIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// Interface für die Gerätetypen
interface DeviceType {
  id: number;
  name: string;
}

// Interface für die Marken
interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
}

// Interface für die Modelle
interface Model {
  id: number;
  name: string;
  brandId: number;
}

// Props für die Komponente
interface MobileDeviceListProps {
  items: Array<DeviceType | Brand | Model>;
  type: 'deviceType' | 'brand' | 'model';
  onSelect?: (item: DeviceType | Brand | Model) => void;
  selectedId?: number | null;
  onCheckboxChange?: (id: number, checked: boolean) => void;
  selectedIds?: number[];
  showCheckboxes?: boolean;
  getDeviceTypeName?: (item: any) => string;
}

// Hilfsfunktion für die Gerätetyp-Icons
const getDeviceTypeIcon = (typeName: string) => {
  const iconClassName = "mr-2 h-5 w-5 text-muted-foreground";
  
  switch (typeName.toLowerCase()) {
    case 'smartphone':
      return <Smartphone className={iconClassName} />;
    case 'tablet':
      return <Tablet className={iconClassName} />;
    case 'laptop':
      return <Laptop className={iconClassName} />;
    case 'watch':
    case 'smartwatch':
      return <Watch className={iconClassName} />;
    case 'spielekonsole':
    case 'gameconsole':
      return <GamepadIcon className={iconClassName} />;
    default:
      return <Smartphone className={iconClassName} />;
  }
};

// Hauptkomponente
export default function MobileDeviceList({
  items,
  type,
  onSelect,
  selectedId,
  onCheckboxChange,
  selectedIds = [],
  showCheckboxes = false,
  getDeviceTypeName,
}: MobileDeviceListProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const isChecked = selectedIds.includes(item.id);
        
        return (
          <Card 
            key={item.id}
            className={`${isSelected ? 'ring-2 ring-primary' : ''} cursor-pointer`}
            onClick={() => onSelect && onSelect(item)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {showCheckboxes && onCheckboxChange && (
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      onCheckboxChange(item.id, !!checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${item.name} auswählen`}
                  />
                )}
                
                <div className="flex flex-col">
                  <div className="font-medium">{item.name}</div>
                  
                  {type === 'model' && getDeviceTypeName && (
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      {getDeviceTypeIcon(getDeviceTypeName(item))}
                      <span>{getDeviceTypeName(item)}</span>
                    </div>
                  )}
                  
                  {type === 'brand' && getDeviceTypeName && (
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      {getDeviceTypeIcon(getDeviceTypeName(item))}
                      <span>{getDeviceTypeName(item)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}