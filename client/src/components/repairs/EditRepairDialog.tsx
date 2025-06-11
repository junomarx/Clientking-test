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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form schema - orderCode excluded from form data since it's read-only
const repairEditSchema = z.object({
  deviceType: z.string().min(1, { message: 'Bitte Gerätetyp eingeben' }),
  brand: z.string().min(1, { message: 'Bitte Marke eingeben' }),
  model: z.string().min(1, { message: 'Bitte Modell eingeben' }),
  serialNumber: z.string().nullable().optional(),
  issue: z.string().min(5, { message: 'Bitte Fehlerbeschreibung eingeben' }),
  estimatedCost: z.string().nullable().optional(),
  depositAmount: z.string().nullable().optional(),
  status: z.enum(['eingegangen', 'in_reparatur', 'ersatzteile_bestellen', 'warten_auf_ersatzteile', 'ersatzteil_eingetroffen', 'ausser_haus', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
  notes: z.string().nullable().optional(),
  technicianNote: z.string().nullable().optional(),
});

type RepairEditValues = z.infer<typeof repairEditSchema>;

interface EditRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repair: Repair | null;
}

export function EditRepairDialog({ open, onClose, repair }: EditRepairDialogProps) {
  console.log('EditRepairDialog geöffnet:', open, 'repair:', repair?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form definition - orderCode excluded as it's read-only
  const form = useForm<RepairEditValues>({
    resolver: zodResolver(repairEditSchema),
    defaultValues: {
      deviceType: repair?.deviceType || '',
      brand: repair?.brand || '',
      model: repair?.model || '',
      serialNumber: repair?.serialNumber || '',
      issue: repair?.issue || '',
      estimatedCost: repair?.estimatedCost?.toString(),
      depositAmount: repair?.depositAmount?.toString(),
      status: repair?.status || 'eingegangen',
      notes: repair?.notes || '',
      technicianNote: (repair as any)?.technicianNote || '',
    },
  });
  
  // Update form values when repair changes
  useEffect(() => {
    if (repair) {
      form.reset({
        deviceType: repair.deviceType || '',
        brand: repair.brand || '',
        model: repair.model || '',
        serialNumber: repair.serialNumber || '',
        issue: repair.issue,
        estimatedCost: repair.estimatedCost?.toString(),
        depositAmount: repair.depositAmount?.toString(),
        status: repair.status,
        notes: repair.notes || '',
        technicianNote: (repair as any).technicianNote || '',
      });
    }
  }, [repair, form]);
  
  // Update repair mutation
  const updateRepairMutation = useMutation({
    mutationFn: async (data: RepairEditValues) => {
      if (!repair) return null;
      
      // Für Debugging-Zwecke die Daten anzeigen
      console.log("Updating repair data:", data);
      
      // Stelle sicher, dass leere Felder korrekt übermittelt werden
      const cleanData = {
        ...data,
        // Wenn depositAmount leer ist, setze es auf null
        depositAmount: data.depositAmount === "" ? null : data.depositAmount,
        // Wenn estimatedCost leer ist, setze es auf null
        estimatedCost: data.estimatedCost === "" ? null : data.estimatedCost,
        // Wenn serialNumber leer ist, setze es auf null
        serialNumber: data.serialNumber === "" ? null : data.serialNumber,
        // Wenn notes leer ist, setze es auf null
        notes: data.notes === "" ? null : data.notes,
        // Wenn technicianNote leer ist, setze es auf null
        technicianNote: data.technicianNote === "" ? null : data.technicianNote,
      };
      
      console.log("Clean data being sent:", cleanData);
      
      const response = await apiRequest('PATCH', `/api/repairs/${repair.id}`, cleanData);
      
      // Prüfe, ob eine E-Mail gesendet wurde (für Status "ersatzteil_eingetroffen")
      const emailSent = response.headers.get('X-Email-Sent') === 'true';
      
      return { 
        repair: await response.json(),
        emailSent 
      };
    },
    onSuccess: (data) => {
      // Invalidate the queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Close the modal
      handleClose();
      
      // Show success message
      toast({
        title: "Auftrag aktualisiert",
        description: "Die Änderungen wurden erfolgreich gespeichert.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      
      // Wenn eine E-Mail gesendet wurde, zeige ein zusätzliches Toast
      if (data && data.emailSent) {
        toast({
          title: "E-Mail gesendet",
          description: "Der Kunde wurde per E-Mail über das eingetroffene Ersatzteil informiert.",
          duration: 3000
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Speichern",
        description: "Die Änderungen konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      console.error("Error updating repair:", error);
    }
  });
  
  // Delete repair mutation
  const deleteRepairMutation = useMutation({
    mutationFn: async () => {
      if (!repair) return null;
      await apiRequest('DELETE', `/api/repairs/${repair.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Show success message
      toast({
        title: "Auftrag gelöscht",
        description: "Der Reparaturauftrag wurde erfolgreich gelöscht.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      
      // Close dialog
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Löschen",
        description: "Der Reparaturauftrag konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      console.error("Error deleting repair:", error);
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
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-xl font-semibold text-primary">Auftrag bearbeiten</DialogTitle>
          <DialogDescription className="mt-1">
            Auftrag {repair.orderCode || `#${repair.id}`} für das Gerät {repair.brand} {repair.model}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4 px-1 overflow-y-auto">
            
            {/* Auftragsnummer - Nur zur Anzeige */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Auftragsnummer
              </label>
              <Input 
                value={repair?.orderCode || `#${repair?.id}`}
                placeholder="z.B. GS250068"
                className="rounded-lg border-gray-300 bg-gray-50"
                readOnly
                disabled
              />
            </div>

            {/* Geräte-Informationen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="z.B. Smartphone"
                        className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marke</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="z.B. Apple"
                        className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modell</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="z.B. iPhone 14"
                        className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seriennummer */}
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seriennummer (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Seriennummer des Geräts"
                      value={field.value === null || field.value === undefined ? '' : field.value}
                      className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className="resize-none h-[70px] md:h-[100px] rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
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
                        className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anzahlung (€)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="z.B. 50"
                        {...field}
                        value={field.value === null || field.value === undefined ? '' : field.value}
                        className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                      />
                    </FormControl>
                        <FormDescription>Gerät beim Kunden, wenn ausgefüllt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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
                      <SelectTrigger className="rounded-lg border-gray-300 focus:border-primary focus:ring-primary bg-white">
                        <SelectValue placeholder="Status auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg border-gray-300 shadow-lg">
                      <SelectItem value="eingegangen" className="hover:bg-primary/10">Eingegangen</SelectItem>
                      <SelectItem value="in_reparatur" className="hover:bg-primary/10">In Reparatur</SelectItem>
                      <SelectItem value="ersatzteil_eingetroffen" className="hover:bg-primary/10">Ersatzteil eingetroffen</SelectItem>
                      <SelectItem value="ausser_haus" className="hover:bg-primary/10">Außer Haus</SelectItem>
                      <SelectItem value="fertig" className="hover:bg-primary/10">Fertig</SelectItem>
                      <SelectItem value="abgeholt" className="hover:bg-primary/10">Abgeholt</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notizen</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Interne Notizen"
                      className="resize-none h-[70px] md:h-[100px] rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
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
            
            <FormField
              control={form.control}
              name="technicianNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Techniker-Notiz</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notiz für 'Außer Haus' Status"
                      className="resize-none h-[70px] md:h-[100px] rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
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
            
            <DialogFooter className="pt-6 mt-2 flex justify-between border-t">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  type="button"
                  className="rounded-lg hover:bg-gray-100"
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="rounded-lg"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Löschen
                </Button>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichere...
                  </>
                ) : (
                  'Änderungen speichern'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteRepairMutation.mutate()}
        title="Reparatur löschen"
        description={`Möchten Sie wirklich die Reparatur für ${repair.brand} ${repair.model} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        isDeleting={deleteRepairMutation.isPending}
        itemName="Reparatur"
      />
    </Dialog>
  );
}