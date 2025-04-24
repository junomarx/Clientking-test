import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Repair } from '@/lib/types';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form schema
const repairEditSchema = z.object({
  issue: z.string().min(5, { message: 'Bitte Fehlerbeschreibung eingeben' }),
  estimatedCost: z.string().nullable().optional(),
  status: z.enum(['eingegangen', 'in_reparatur', 'ausser_haus', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
  notes: z.string().nullable().optional(),
});

type RepairEditValues = z.infer<typeof repairEditSchema>;

interface EditRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repair: Repair | null;
}

export function EditRepairDialog({ open, onClose, repair }: EditRepairDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form definition
  const form = useForm<RepairEditValues>({
    resolver: zodResolver(repairEditSchema),
    defaultValues: {
      issue: repair?.issue || '',
      estimatedCost: repair?.estimatedCost?.toString(),
      status: repair?.status || 'eingegangen',
      notes: repair?.notes || '',
    },
  });
  
  // Update form values when repair changes
  useEffect(() => {
    if (repair) {
      form.reset({
        issue: repair.issue,
        estimatedCost: repair.estimatedCost?.toString(),
        status: repair.status,
        notes: repair.notes || '',
      });
    }
  }, [repair, form]);
  
  // Update repair mutation
  const updateRepairMutation = useMutation({
    mutationFn: async (data: RepairEditValues) => {
      if (!repair) return null;
      const response = await apiRequest('PATCH', `/api/repairs/${repair.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Close the modal
      handleClose();
      
      // Show success message
      toast({
        title: "Auftrag aktualisiert",
        description: "Die Änderungen wurden erfolgreich gespeichert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Speichern",
        description: "Die Änderungen konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      console.error("Error updating repair:", error);
    }
  });
  
  const onSubmit = (data: RepairEditValues) => {
    updateRepairMutation.mutate(data);
  };
  
  const handleClose = () => {
    form.reset();
    onClose();
  };
  
  // Determine if the form is submitting
  const isSubmitting = updateRepairMutation.isPending;

  if (!repair) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Auftrag bearbeiten</DialogTitle>
          <DialogDescription>
            Auftrag #{repair.id} für das Gerät {repair.model}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="issue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fehlerbeschreibung</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Beschreiben Sie das Problem"
                      className="resize-none min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kostenvoranschlag (€)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="z.B. 150 oder 150-180"
                        {...field}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="eingegangen">Eingegangen</SelectItem>
                        <SelectItem value="in_reparatur">In Reparatur</SelectItem>
                        <SelectItem value="ausser_haus">Außer Haus</SelectItem>
                        <SelectItem value="fertig">Fertig</SelectItem>
                        <SelectItem value="abgeholt">Abgeholt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notizen</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Interne Notizen"
                      className="resize-none min-h-[80px]"
                      value={field.value === null ? '' : (field.value || '')}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleClose} type="button">
                Abbrechen
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}