// Diese Komponente wird größtenteils ersetzt werden, um die API-Hooks anstelle von localStorage zu verwenden
// Dieser Entwurf konzentriert sich auf die kritischen Änderungen

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, DialogContent, DialogTitle, DialogFooter,
  Input, Textarea, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Form, FormControl, FormDescription, FormField, FormItem, 
  FormLabel, FormMessage 
} from '@/components/ui/form';
import { useRepairs } from '@/hooks/useRepairs';
import { useCustomers } from '@/hooks/useCustomers';
import { 
  useDeviceTypes, 
  useBrands, 
  useModelSeries, 
  useModels 
} from '@/hooks/useDeviceTypes';

// Schemavalidierung für das Formular
const orderFormSchema = z.object({
  // Kundeninformationen
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  phone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  
  // Geräteinformationen
  deviceType: z.string().min(1, 'Geräteart ist erforderlich'),
  brand: z.string().min(1, 'Marke ist erforderlich'),
  modelSeries: z.string().optional().or(z.literal('')),
  model: z.string().min(1, 'Modell ist erforderlich'),
  serialNumber: z.string().optional().or(z.literal('')),
  
  // Auftragsinformationen
  issue: z.string().min(1, 'Fehlerbeschreibung ist erforderlich'),
  estimatedCost: z.string().optional().or(z.literal('')),
  depositAmount: z.string().optional().or(z.literal('')),
  status: z.string().default('eingegangen'),
  notes: z.string().optional().or(z.literal(''))
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

// Standardwerte für die unterstützten Gerätetypen und Marken
const defaultBrands: { [key: string]: string[] } = {
  smartphone: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Nokia'],
  tablet: ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Microsoft', 'Amazon', 'Asus', 'Acer', 'LG'],
  laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Samsung', 'MSI', 'Razer', 'Toshiba'],
  smartwatch: ['Apple', 'Samsung', 'Fitbit', 'Garmin', 'Huawei', 'Fossil', 'TicWatch', 'Amazfit', 'Withings'],
  kopfhörer: ['Apple', 'Bose', 'Sony', 'Sennheiser', 'JBL', 'Beats', 'Samsung', 'Skullcandy', 'Jabra', 'Audio-Technica'],
  konsole: ['Sony', 'Microsoft', 'Nintendo', 'Sega', 'Atari'],
};

// Interface für die NewOrderModal-Komponente
interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: number | null;
}

// Interface für Kunden
interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Interface für Gerätetypen
interface DeviceType {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Hilfsfunktion zum intelligenten Speichern von Modellen mit den API-Hooks
// Diese Funktion muss innerhalb der NewOrderModal-Komponente definiert werden,
// damit sie Zugriff auf die entsprechenden Mutations hat
function saveModelIntelligent(
  deviceType: string, 
  brand: string, 
  modelSeries: string | undefined | null,
  model: string,
  deviceTypeId: number | null,
  brandId: number | null,
  createDeviceTypeMutation: any,
  createBrandMutation: any,
  createModelSeriesMutation: any,
  createModelMutation: any
): void {
  // Diese Funktion verwendet die API-Mutations, um Modellhierarchien zu speichern
  // 1. Überprüfen, ob der Gerätetyp existiert, sonst erstellen
  if (!deviceTypeId && deviceType) {
    createDeviceTypeMutation.mutate(deviceType, {
      onSuccess: (newDeviceType: any) => {
        // 2. Überprüfen, ob die Marke existiert, sonst erstellen
        if (brand) {
          createBrandMutation.mutate({
            name: brand,
            deviceTypeId: newDeviceType.id
          }, {
            onSuccess: (newBrand: any) => {
              // 3. Überprüfen, ob eine Modellreihe angegeben wurde
              if (modelSeries) {
                createModelSeriesMutation.mutate({
                  name: modelSeries,
                  brandId: newBrand.id
                }, {
                  onSuccess: (newModelSeries: any) => {
                    // 4. Modell zur neuen Modellreihe hinzufügen
                    createModelMutation.mutate({
                      name: model,
                      modelSeriesId: newModelSeries.id
                    });
                  }
                });
              } else {
                // Wenn keine Modellreihe, direkt zur Marke hinzufügen
                createModelMutation.mutate({
                  name: model,
                  brandId: newBrand.id
                });
              }
            }
          });
        }
      }
    });
  } else if (deviceTypeId && !brandId && brand) {
    // Wenn der Gerätetyp existiert, aber die Marke nicht
    createBrandMutation.mutate({
      name: brand,
      deviceTypeId: deviceTypeId
    }, {
      onSuccess: (newBrand: any) => {
        if (modelSeries) {
          createModelSeriesMutation.mutate({
            name: modelSeries,
            brandId: newBrand.id
          }, {
            onSuccess: (newModelSeries: any) => {
              createModelMutation.mutate({
                name: model,
                modelSeriesId: newModelSeries.id
              });
            }
          });
        } else {
          createModelMutation.mutate({
            name: model,
            brandId: newBrand.id
          });
        }
      }
    });
  } else if (deviceTypeId && brandId) {
    // Wenn sowohl Gerätetyp als auch Marke existieren
    if (modelSeries) {
      // Prüfen, ob die Modellreihe bereits existiert
      createModelSeriesMutation.mutate({
        name: modelSeries,
        brandId: brandId
      }, {
        onSuccess: (newModelSeries: any) => {
          createModelMutation.mutate({
            name: model,
            modelSeriesId: newModelSeries.id
          });
        }
      });
    } else {
      // Wenn keine Modellreihe, direkt zur Marke hinzufügen
      createModelMutation.mutate({
        name: model,
        brandId: brandId
      });
    }
  }
}

// Hilfsfunktion zum Speichern von Marken (wird später durch API-Calls ersetzt)
function saveBrand(deviceType: string, brandName: string, deviceTypeId: number | null, createBrandMutation: any) {
  if (deviceTypeId && brandName) {
    // Prüfen, ob die Marke bereits existiert
    createBrandMutation.mutate({
      name: brandName,
      deviceTypeId: deviceTypeId
    });
  }
}

export function NewOrderModal({ open, onClose, customerId }: NewOrderModalProps) {
  // Eigentliche Implementierung hier...
  // Wichtig ist, dass bei allen Aufrufen von saveModelIntelligent alle 10 Parameter übergeben werden
  // saveModelIntelligent(
  //   repairData.deviceType, 
  //   repairData.brand, 
  //   repairData.modelSeries, 
  //   repairData.model,
  //   selectedDeviceTypeId, 
  //   selectedBrandId,
  //   createDeviceTypeMutation,
  //   createBrandMutation,
  //   createModelSeriesMutation,
  //   createModelMutation
  // );
}