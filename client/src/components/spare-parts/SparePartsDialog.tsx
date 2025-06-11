import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { SparePart, InsertSparePart } from "@shared/schema";
import { z } from "zod";

const formSchema = insertSparePartSchema.omit({ 
  userId: true, 
  shopId: true 
});

type FormData = z.infer<typeof formSchema>;

interface SparePartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairId: number;
  sparePart?: SparePart;
  mode: "create" | "edit";
}

export default function SparePartsDialog({
  open,
  onOpenChange,
  repairId,
  sparePart,
  mode,
}: SparePartsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repairId,
      partName: "",
      supplier: "",
      cost: "",
      status: "bestellen",
      notes: "",
    },
  });

  // Form mit vorhandenen Daten füllen beim Bearbeiten
  useEffect(() => {
    if (mode === "edit" && sparePart && open) {
      form.reset({
        repairId: sparePart.repairId,
        partName: sparePart.partName,
        supplier: sparePart.supplier || "",
        cost: sparePart.cost?.toString() || "", // Convert number to string for form
        status: sparePart.status,
        orderDate: sparePart.orderDate ? new Date(sparePart.orderDate).toISOString().split('T')[0] : undefined,
        deliveryDate: sparePart.deliveryDate ? new Date(sparePart.deliveryDate).toISOString().split('T')[0] : undefined,
        notes: sparePart.notes || "",
      });
    } else if (mode === "create" && open) {
      form.reset({
        repairId,
        partName: "",
        status: "bestellen",
      });
    }
  }, [mode, sparePart, open, repairId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData: InsertSparePart = {
        ...data,
      };
      
      const response = await apiRequest("POST", "/api/spare-parts", submitData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs", repairId, "spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      toast({
        title: "Ersatzteil erstellt",
        description: "Das Ersatzteil wurde erfolgreich hinzugefügt.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Erstellen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!sparePart) throw new Error("Kein Ersatzteil zum Bearbeiten");
      
      const submitData = {
        ...data,
        cost: parseFloat(data.cost.replace(',', '.')), // Convert string to number
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      };
      
      const response = await apiRequest("PATCH", `/api/spare-parts/${sparePart.id}`, submitData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs", repairId, "spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      toast({
        title: "Ersatzteil aktualisiert",
        description: "Das Ersatzteil wurde erfolgreich bearbeitet.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Bearbeiten",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const currentStatus = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Ersatzteil hinzufügen" : "Ersatzteil bearbeiten"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Fügen Sie ein neues Ersatzteil für diese Reparatur hinzu."
              : "Bearbeiten Sie die Details des Ersatzteils."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {(currentStatus === "bestellt" || currentStatus === "eingetroffen") && (
                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bestelldatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {currentStatus === "eingetroffen" && (
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieferdatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notizen</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zusätzliche Informationen zum Ersatzteil..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {mode === "create" ? "Hinzufügen" : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}