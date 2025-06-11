import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
      repairId: repairId,
      partName: "",
      status: "bestellen",
    },
  });

  useEffect(() => {
    if (mode === "edit" && sparePart && open) {
      form.reset({
        repairId: sparePart.repairId,
        partName: sparePart.partName,
        status: sparePart.status as "bestellen" | "bestellt" | "eingetroffen",
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
      const response = await apiRequest("PUT", `/api/spare-parts/${sparePart?.id}`, data);
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
        description: "Das Ersatzteil wurde erfolgreich aktualisiert.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Neues Ersatzteil" : "Ersatzteil bearbeiten"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
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