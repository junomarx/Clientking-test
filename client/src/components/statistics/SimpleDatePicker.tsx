import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { de } from 'date-fns/locale';

interface SimpleDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onApply: () => void;
}

export function SimpleDatePicker({
  isOpen,
  onClose,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply
}: SimpleDatePickerProps) {
  if (!isOpen) return null;
  
  return (
    <div className="mb-6 p-4 border rounded-md shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">Zeitraum wählen</span>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 w-7 p-0" 
          onClick={onClose}
        >
          ×
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs mb-1 text-muted-foreground">Von</p>
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={onStartDateChange}
            className="border rounded-md p-2"
            locale={de}
            disabled={{after: endDate || new Date()}}
          />
        </div>
        
        <div>
          <p className="text-xs mb-1 text-muted-foreground">Bis</p>
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={onEndDateChange}
            className="border rounded-md p-2"
            locale={de}
            disabled={{before: startDate, after: new Date()}}
          />
        </div>
      </div>
      
      <div className="flex justify-end mt-3">
        <Button 
          size="sm" 
          onClick={onApply}
          disabled={!startDate || !endDate}
        >
          Übernehmen
        </Button>
      </div>
    </div>
  );
}