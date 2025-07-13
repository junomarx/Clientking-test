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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { insertSparePartSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { InsertSparePart, SparePart } from "@shared/schema";
import { z } from "zod";
import { Trash2, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const formSchema = insertSparePartSchema.omit({ 
  userId: true, 
  shopId: true,
  repairId: true
}).extend({
  cost: z.number().optional(),
  status: z.enum(["bestellen", "bestellt", "eingetroffen"]).default("bestellen"),
});

type FormData = z.infer<typeof formSchema>;

interface SparePartsManagementDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number;
}

export function SparePartsManagementDialog({
  open,
  onClose,
  repairId,
}: SparePartsManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partName: "",
      supplier: "",
      cost: undefined,
      status: "bestellen",
      notes: "",
    },
  });

  // Ersatzteile für diese Reparatur abrufen
  const { data: spareParts = [], isLoading } = useQuery<SparePart[]>({
    queryKey: ['/api/repairs', repairId, 'spare-parts'],
    enabled: open && !!repairId,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        partName: "",
        supplier: "",
        cost: undefined,
        status: "bestellen",
        notes: "",
      });
      setIsAddingNew(false);
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData: InsertSparePart = {
        ...data,
        repairId,
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
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', repairId, 'spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs/with-spare-parts'] });
      toast({
        title: "Ersatzteil hinzugefügt",
        description: "Das Ersatzteil wurde erfolgreich hinzugefügt.",
      });
      setIsAddingNew(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Hinzufügen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SparePart> }) => {
      const response = await apiRequest("PATCH", `/api/spare-parts/${id}`, data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', repairId, 'spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs/with-spare-parts'] });
      toast({
        title: "Ersatzteil aktualisiert",
        description: "Das Ersatzteil wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/spare-parts/${id}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', repairId, 'spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs/with-spare-parts'] });
      toast({
        title: "Ersatzteil gelöscht",
        description: "Das Ersatzteil wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const handleDelete = (id: number) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Ersatzteil löschen möchten?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'destructive';
      case 'bestellt':
        return 'secondary';
      case 'eingetroffen':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'Bestellen';
      case 'bestellt':
        return 'Bestellt';
      case 'eingetroffen':
        return 'Eingetroffen';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Ersatzteile verwalten</DialogTitle>
            {/* Schließen-Button nur für mobile Ansicht */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Bestehende Ersatzteile */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <h3 className="text-sm font-medium">Bestehende Ersatzteile</h3>
              <Button
                size="sm"
                onClick={() => setIsAddingNew(true)}
                disabled={isAddingNew}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Hinzufügen
              </Button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">Laden...</div>
            ) : spareParts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                Keine Ersatzteile vorhanden
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Lieferant</TableHead>
                        <TableHead>Kosten</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erstellt</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spareParts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{part.partName}</div>
                              {part.notes && (
                                <div className="text-xs text-gray-500 mt-1">{part.notes}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{part.supplier || '-'}</TableCell>
                          <TableCell>
                            {part.cost ? `€${part.cost.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={part.status}
                              onValueChange={(value) => handleStatusChange(part.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bestellen">Bestellen</SelectItem>
                                <SelectItem value="bestellt">Bestellt</SelectItem>
                                <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(part.createdAt), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(part.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {spareParts.map((part) => (
                    <Card key={part.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{part.partName}</div>
                            {part.notes && (
                              <div className="text-xs text-gray-500 mt-1">{part.notes}</div>
                            )}
                          </div>
                          <Badge variant={getStatusBadgeVariant(part.status)} className="text-xs ml-2">
                            {getStatusLabel(part.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Lieferant:</span> {part.supplier || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Kosten:</span> {part.cost ? `€${part.cost.toFixed(2)}` : '-'}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Erstellt:</span> {format(new Date(part.createdAt), 'dd.MM.yyyy', { locale: de })}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <Select
                            value={part.status}
                            onValueChange={(value) => handleStatusChange(part.id, value)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bestellen">Bestellen</SelectItem>
                              <SelectItem value="bestellt">Bestellt</SelectItem>
                              <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(part.id)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Neues Ersatzteil hinzufügen */}
          {isAddingNew && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Neues Ersatzteil hinzufügen</h3>
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

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "bestellen"}>
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
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingNew(false)}
                      className="w-full sm:w-auto"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {createMutation.isPending && (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      )}
                      Hinzufügen
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}