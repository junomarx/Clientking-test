import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, CalendarIcon } from 'lucide-react';

interface CreateCostEstimateFormProps {
  onSuccess?: () => void;
}

export default function SimpleCostEstimateForm({ onSuccess }: CreateCostEstimateFormProps) {
  const { toast } = useToast();
  
  // Standard-Gültigkeitsdatum (14 Tage ab heute)
  const defaultValidUntil = addDays(new Date(), 14);
  const formattedDate = format(defaultValidUntil, "PPP", { locale: de });
  
  // Dummy-Handler für Formularabsendung
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Formular wurde abgesendet",
      description: "Ihre Daten wurden erfolgreich gespeichert."
    });
    if (onSuccess) onSuccess();
  };
  
  return (
    <div className="font-sans">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-lg font-bold">Neuen Kostenvoranschlag erstellen</h2>
          <p className="text-gray-600 text-xs">Erstellen Sie einen neuen Kostenvoranschlag für einen Kunden.</p>
        </div>
        <button onClick={onSuccess} className="rounded-md p-1 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <h1 className="text-xl font-bold text-center my-4">Kostenvoranschlag Generator</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="bg-[#f9f9f9] rounded-lg p-4 border border-[#ddd] mb-4">
          <h2 className="text-base font-bold border-b border-[#ddd] pb-2 mb-3">Kundendaten</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Vorname*</label>
              <Input 
                className="w-full h-9 border border-[#ddd] rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nachname*</label>
              <Input 
                className="w-full h-9 border border-[#ddd] rounded" 
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Adresse*</label>
            <Input 
              className="w-full h-9 border border-[#ddd] rounded" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">PLZ*</label>
              <Input 
                className="w-full h-9 border border-[#ddd] rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ort*</label>
              <Input 
                className="w-full h-9 border border-[#ddd] rounded" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Telefonnummer*</label>
              <Input 
                className="w-full h-9 border border-[#ddd] rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail*</label>
              <Input 
                type="email"
                className="w-full h-9 border border-[#ddd] rounded" 
              />
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Gültig bis*</label>
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 justify-start text-left border border-[#ddd] rounded"
            >
              {formattedDate}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Abbrechen
          </Button>
          <Button type="submit">
            Kostenvoranschlag erstellen
          </Button>
        </div>
      </form>
    </div>
  );
}