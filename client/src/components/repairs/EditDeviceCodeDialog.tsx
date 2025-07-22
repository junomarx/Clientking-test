import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EditDeviceCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairId: number;
  currentCode?: string;
  currentCodeType?: string;
}

// Pattern grid component for visual input
function PatternGrid({ 
  selectedDots, 
  onDotsChange 
}: { 
  selectedDots: number[], 
  onDotsChange: (dots: number[]) => void 
}) {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDotClick = (index: number) => {
    if (!isDrawing) {
      // Start new pattern
      setIsDrawing(true);
      onDotsChange([index]);
    } else {
      // Continue pattern if dot not already selected
      if (!selectedDots.includes(index)) {
        onDotsChange([...selectedDots, index]);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="space-y-4">
      <div 
        className="grid grid-cols-3 gap-3 bg-white border rounded-lg p-4 mx-auto select-none" 
        style={{ width: '160px', height: '160px' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors ${
              selectedDots.includes(i) 
                ? 'bg-blue-500 border-blue-600 text-white' 
                : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
            }`}
            onClick={() => handleDotClick(i)}
            onMouseEnter={() => {
              if (isDrawing && !selectedDots.includes(i)) {
                onDotsChange([...selectedDots, i]);
              }
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="text-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            onDotsChange([]);
            setIsDrawing(false);
          }}
        >
          Muster zurücksetzen
        </Button>
      </div>
      {selectedDots.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Gewähltes Muster: {selectedDots.map(d => d + 1).join(' → ')}
        </div>
      )}
    </div>
  );
}

export function EditDeviceCodeDialog({ 
  open, 
  onOpenChange, 
  repairId, 
  currentCode, 
  currentCodeType 
}: EditDeviceCodeDialogProps) {
  const [codeType, setCodeType] = useState(currentCodeType || 'pin');
  const [codeValue, setCodeValue] = useState(currentCode || '');
  const [patternDots, setPatternDots] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCodeMutation = useMutation({
    mutationFn: async (data: { deviceCode: string; deviceCodeType: string }) => {
      const response = await apiRequest('PATCH', `/api/repairs/${repairId}/device-code`, data);
      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Gerätecodes');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple query patterns to ensure UI updates
      queryClient.invalidateQueries({ queryKey: [`/api/repairs/${repairId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: [`/api/repairs/${repairId}/device-code`] });
      
      // Force refresh of all repair-related data
      queryClient.refetchQueries({ queryKey: ['/api/repairs'] });
      queryClient.refetchQueries({ queryKey: [`/api/repairs/${repairId}`] });
      
      toast({
        title: 'Erfolg',
        description: 'Gerätecode wurde erfolgreich gespeichert',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Gerätecode konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/repairs/${repairId}/device-code`);
      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Gerätecodes');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple query patterns to ensure UI updates
      queryClient.invalidateQueries({ queryKey: [`/api/repairs/${repairId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: [`/api/repairs/${repairId}/device-code`] });
      
      // Force refresh of all repair-related data
      queryClient.refetchQueries({ queryKey: ['/api/repairs'] });
      queryClient.refetchQueries({ queryKey: [`/api/repairs/${repairId}`] });
      
      toast({
        title: 'Erfolg',
        description: 'Gerätecode wurde erfolgreich gelöscht',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Gerätecode konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    let finalCodeValue = '';
    
    if (codeType === 'pattern') {
      if (patternDots.length < 2) {
        toast({
          title: 'Fehler',
          description: 'Ein Muster muss mindestens 2 Punkte verbinden',
          variant: 'destructive',
        });
        return;
      }
      finalCodeValue = patternDots.join('-');
    } else {
      if (!codeValue.trim()) {
        toast({
          title: 'Fehler',
          description: 'Bitte geben Sie einen Code ein',
          variant: 'destructive',
        });
        return;
      }
      finalCodeValue = codeValue;
    }

    updateCodeMutation.mutate({
      deviceCode: finalCodeValue,
      deviceCodeType: codeType,
    });
  };

  const handleDelete = () => {
    deleteCodeMutation.mutate();
  };

  // Parse existing pattern if available
  React.useEffect(() => {
    if (currentCodeType === 'pattern' && currentCode) {
      const dots = currentCode.split('-').filter(d => d !== '').map(Number);
      setPatternDots(dots);
    }
  }, [currentCode, currentCodeType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerätecode bearbeiten</DialogTitle>
          <DialogDescription>
            Geben Sie den PIN, das Passwort oder das Entsperrmuster für das Gerät ein.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="codeType">Code-Typ</Label>
            <Select value={codeType} onValueChange={setCodeType}>
              <SelectTrigger>
                <SelectValue placeholder="Code-Typ auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pin">PIN (Zahlen)</SelectItem>
                <SelectItem value="password">Passwort (Text)</SelectItem>
                <SelectItem value="pattern">Entsperrmuster</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {codeType === 'pattern' ? (
            <div>
              <Label>Entsperrmuster</Label>
              <PatternGrid 
                selectedDots={patternDots} 
                onDotsChange={setPatternDots}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="codeValue">
                {codeType === 'pin' ? 'PIN eingeben' : 'Passwort eingeben'}
              </Label>
              <Input
                id="codeValue"
                type={codeType === 'pin' ? 'number' : 'text'}
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value)}
                placeholder={codeType === 'pin' ? 'z.B. 1234' : 'z.B. MeinPasswort123'}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {(currentCode || currentCodeType) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCodeMutation.isPending}
            >
              {deleteCodeMutation.isPending ? 'Löscht...' : 'Code löschen'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateCodeMutation.isPending}
          >
            {updateCodeMutation.isPending ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}