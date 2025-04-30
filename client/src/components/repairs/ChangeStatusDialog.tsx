import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form schema
const statusSchema = z.object({
  status: z.enum(['eingegangen', 'in_reparatur', 'ersatzteil_eingetroffen', 'ausser_haus', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
});

type StatusFormValues = z.infer<typeof statusSchema>;

interface ChangeStatusDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  currentStatus: string;
  onUpdateStatus: (id: number, status: string) => void;
}

export function ChangeStatusDialog({ 
  open, 
  onClose, 
  repairId,
  currentStatus,
  onUpdateStatus
}: ChangeStatusDialogProps) {
  const { toast } = useToast();
  
  // Form definition
  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: (currentStatus || 'eingegangen') as any,
    },
  });
  
  // Übersetzungen für StatusBadge-Labels
  const statusLabels: Record<string, string> = {
    eingegangen: 'Eingegangen',
    in_reparatur: 'In Reparatur',
    ersatzteil_eingetroffen: 'Ersatzteil eingetroffen',
    ausser_haus: 'Außer Haus',
    fertig: 'Fertig zur Abholung',
    abgeholt: 'Abgeholt'
  };
  
  // Form submission handler
  function onSubmit(data: StatusFormValues) {
    if (!repairId) {
      toast({
        title: 'Fehler',
        description: 'Keine Reparatur ausgewählt.',
        variant: 'destructive',
      });
      return;
    }
    
    onUpdateStatus(repairId, data.status);
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Status ändern</DialogTitle>
          <DialogDescription>
            Wählen Sie den neuen Status für die Reparatur.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Status auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit">
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}