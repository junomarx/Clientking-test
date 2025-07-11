import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertSparePartSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { InsertSparePart } from "@shared/schema";
import { z } from "zod";

const formSchema = insertSparePartSchema.omit({ 
  userId: true, 
  shopId: true 
}).extend({
  cost: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Repair {
  id: number;
  orderCode: string;
  customerId: number;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  status: string;
}

export function AddSparePartDialog({
  open,
  onOpenChange,
}: AddSparePartDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Alle Reparaturen abrufen für die Auswahl
  const { data: repairs = [] } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
    enabled: open,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repairId: undefined,
      partName: "",
      supplier: "",
      cost: undefined,
      status: "bestellen",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        repairId: undefined,
        partName: "",
        supplier: "",
        cost: undefined,
        status: "bestellen",
        notes: "",
      });
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData: InsertSparePart = {
        ...data,
        cost: data.cost || undefined,
      };
      
      const response = await apiRequest("POST", "/api/spare-parts", submitData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs/with-spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      toast({
        title: "Ersatzteil hinzugefügt",
        description: "Das Ersatzteil wurde erfolgreich hinzugefügt.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Hinzufügen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ersatzteil direkt hinzufügen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="repairId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reparatur auswählen *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Reparatur auswählen..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {repairs.map((repair) => (
                          <SelectItem key={repair.id} value={repair.id.toString()}>
                            {repair.orderCode} - {repair.brand} {repair.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ersatzteil-Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Display, Akku, Kamera..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieferant</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. iFixit, Alibaba..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kosten (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
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
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bestellen">Bestellen</SelectItem>
                        <SelectItem value="bestellt">Bestellt</SelectItem>
                        <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
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
                        placeholder="Zusätzliche Informationen..." 
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                Hinzufügen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}