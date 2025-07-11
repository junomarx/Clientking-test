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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertAccessorySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { InsertAccessory } from "@shared/schema";
import { z } from "zod";

interface Article {
  articleName: string;
  quantity: number;
}

const accessoryFormSchema = z.object({
  // Auf Lager Checkbox
  inStock: z.boolean(),
  
  // Kundendaten (nur wenn nicht auf Lager)
  customerSearch: z.string().optional(),
  selectedCustomerId: z.number().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  
  // Für Einzelartikel (alte Methode - nicht auf Lager)
  articleName: z.string().optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  
  // Für Multi-Artikel (auf Lager)
  articles: z.array(z.object({
    articleName: z.string().min(1, "Artikel-Name ist erforderlich"),
    quantity: z.number().min(1, "Stückzahl muss mindestens 1 sein"),
  })).optional(),
  
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validierung für Auf Lager vs. Einzelartikel
  if (data.inStock) {
    // Auf Lager: Validiere Artikel-Array
    if (!data.articles || data.articles.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mindestens ein Artikel ist erforderlich",
        path: ["articles"],
      });
    }
  } else {
    // Nicht auf Lager: Validiere Einzelartikel und Kundendaten
    if (!data.articleName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Artikel-Name ist erforderlich",
        path: ["articleName"],
      });
    }
    if (!data.quantity || data.quantity < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stückzahl muss mindestens 1 sein",
        path: ["quantity"],
      });
    }
    if (data.price === undefined || data.price < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preis muss positiv sein",
        path: ["price"],
      });
    }
    if (!data.selectedCustomerId && (!data.firstName || !data.lastName || !data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wählen Sie einen Kunden aus oder geben Sie vollständige Kundendaten ein",
        path: ["firstName"],
      });
    }
  }
});

type AccessoryFormData = z.infer<typeof accessoryFormSchema>;

interface AddAccessoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
}

export function AddAccessoryDialog({
  open,
  onOpenChange,
}: AddAccessoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: Kunde/Lager, 2: Artikel
  const [customerSearch, setCustomerSearch] = useState("");
  const [articles, setArticles] = useState<Article[]>([{ articleName: "", quantity: 1 }]);

  // Kundendaten abrufen für Autovervollständigung
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open,
  });

  const form = useForm<AccessoryFormData>({
    resolver: zodResolver(accessoryFormSchema),
    defaultValues: {
      inStock: false,
      customerSearch: "",
      selectedCustomerId: undefined,
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      articleName: "",
      quantity: 1,
      price: 0,
      articles: [{ articleName: "", quantity: 1 }],
      notes: "",
    },
  });

  const inStock = form.watch('inStock');
  const selectedCustomerId = form.watch('selectedCustomerId');

  // Gefilterte Kunden basierend auf Suche
  const filteredCustomers = customers.filter(customer =>
    customerSearch === "" || 
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  useEffect(() => {
    if (open) {
      setStep(1);
      setCustomerSearch("");
      setArticles([{ articleName: "", quantity: 1 }]);
      form.reset({
        inStock: false,
        customerSearch: "",
        selectedCustomerId: undefined,
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        articleName: "",
        quantity: 1,
        price: 0,
        articles: [{ articleName: "", quantity: 1 }],
        notes: "",
      });
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AccessoryFormData) => {
      let customerId: number | null = null;
      
      // Nur wenn nicht auf Lager - Kunde verarbeiten
      if (!data.inStock) {
        if (data.selectedCustomerId) {
          // Bestehender Kunde ausgewählt
          customerId = data.selectedCustomerId;
        } else {
          // Neuen Kunden erstellen
          const customerResponse = await apiRequest("POST", "/api/customers", {
            firstName: data.firstName!,
            lastName: data.lastName!,
            phone: data.phone!,
            email: data.email || undefined,
            address: data.address || undefined,
          });
          
          if (!customerResponse.ok) {
            throw new Error("Fehler beim Erstellen des Kunden");
          }
          
          const customer = await customerResponse.json();
          customerId = customer.id;
        }
      }
      
      // Verschiedene Behandlung für Auf Lager vs. Einzelartikel
      if (data.inStock && data.articles) {
        // Auf Lager: Mehrere Artikel erstellen
        const createdAccessories = [];
        for (const article of data.articles) {
          const accessoryData: InsertAccessory = {
            articleName: article.articleName,
            quantity: article.quantity,
            unitPrice: "0.00", // Kein Preis für Lagerartikel
            totalPrice: "0.00",
            customerId: null, // Kein Kunde für Lagerartikel
            type: "lager",
            status: "bestellt",
            notes: data.notes || "",
          };
          
          const response = await apiRequest("POST", "/api/orders/accessories", accessoryData);
          if (!response.ok) {
            throw new Error(`Fehler beim Erstellen von Artikel: ${article.articleName}`);
          }
          const result = await response.json();
          createdAccessories.push(result);
        }
        return createdAccessories;
      } else {
        // Einzelartikel für Kundenbestellung
        const accessoryData: InsertAccessory = {
          articleName: data.articleName!,
          quantity: data.quantity!,
          unitPrice: data.price!.toFixed(2),
          totalPrice: (data.price! * data.quantity!).toFixed(2),
          customerId: customerId,
          type: "kundenbestellung",
          status: "bestellt",
          notes: data.notes || "",
        };
        
        const response = await apiRequest("POST", "/api/orders/accessories", accessoryData);
        if (!response.ok) {
          throw new Error("Fehler beim Erstellen der Zubehör-Bestellung");
        }
        return response.json();
      }
    },
    onSuccess: (result) => {
      const isMultiple = Array.isArray(result);
      toast({
        title: "Bestellung erstellt",
        description: isMultiple 
          ? `${result.length} Lagerartikel wurden erfolgreich erstellt.`
          : "Die Zubehör-Bestellung wurde erfolgreich erstellt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/accessories"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Erstellen der Bestellung",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AccessoryFormData) => {
    console.log("onSubmit called with data:", data);
    console.log("inStock:", data.inStock);
    console.log("articles state:", articles);
    
    // Für Multi-Artikel: Zusätzliche Validierung
    if (data.inStock) {
      const validArticles = articles.filter(a => a.articleName.trim() !== "" && a.quantity > 0);
      console.log("Valid articles:", validArticles);
      
      if (validArticles.length === 0) {
        toast({
          title: "Validierungsfehler",
          description: "Bitte füllen Sie mindestens einen Artikel vollständig aus.",
          variant: "destructive",
        });
        return;
      }
      data.articles = validArticles;
    }
    
    console.log("Calling createMutation.mutate with:", data);
    createMutation.mutate(data);
  };

  // Funktionen für Multi-Artikel Management
  const addArticle = () => {
    setArticles([...articles, { articleName: "", quantity: 1 }]);
  };

  const removeArticle = (index: number) => {
    if (articles.length > 1) {
      setArticles(articles.filter((_, i) => i !== index));
    }
  };

  const updateArticle = (index: number, field: keyof Article, value: string | number) => {
    const updated = [...articles];
    updated[index] = { ...updated[index], [field]: value };
    setArticles(updated);
  };

  const selectCustomer = (customer: Customer) => {
    form.setValue('selectedCustomerId', customer.id);
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone);
    form.setValue('email', customer.email || '');
    form.setValue('address', customer.address || '');
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
  };

  const nextStep = () => {
    const currentStepFields = getCurrentStepFields();
    form.trigger(currentStepFields).then((isValid) => {
      if (isValid) {
        setStep(step + 1);
      }
    });
  };

  const validateMultiArticles = (): boolean => {
    if (!inStock) return true; // Standard-Validierung für Einzelartikel
    
    const validArticles = articles.filter(a => a.articleName.trim() !== "");
    if (validArticles.length === 0) {
      return false;
    }
    
    // Prüfe ob alle Artikel ausgefüllt sind
    return validArticles.every(a => a.articleName.trim() !== "" && a.quantity > 0);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const getCurrentStepFields = (): (keyof AccessoryFormData)[] => {
    switch (step) {
      case 1:
        // Nur Kundendaten prüfen wenn nicht auf Lager
        if (form.getValues('inStock')) {
          return [];
        }
        return selectedCustomerId ? [] : ['firstName', 'lastName', 'phone'];
      case 2:
        // Verschiedene Validierung für Auf Lager vs. Kundenbestellung
        if (form.getValues('inStock')) {
          return []; // Multi-Artikel werden separat validiert
        }
        return ['articleName', 'quantity', 'price'];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Schritt 1: Kunde/Lager" : "Schritt 2: Artikel"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="inStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Auf Lager
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Für Geschäftsbestellungen ohne Kundendaten
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {!inStock && (
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Kunde suchen</FormLabel>
                      <Input
                        placeholder="Name oder Telefonnummer eingeben..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>

                    {customerSearch && filteredCustomers.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border rounded p-2">
                        {filteredCustomers.map(customer => (
                          <div 
                            key={customer.id} 
                            className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() => selectCustomer(customer)}
                          >
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-gray-600">{customer.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vorname</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nachname</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {inStock ? (
                  // Multi-Artikel Interface für "Auf Lager" - KOMPAKT
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium">Artikel hinzufügen</h3>
                    
                    <div className={`space-y-2 ${articles.length > 4 ? 'max-h-80 overflow-y-auto pr-2' : ''}`}>
                      {articles.map((article, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-8">
                            <Input
                              value={article.articleName}
                              onChange={(e) => updateArticle(index, "articleName", e.target.value)}
                              placeholder="z.B. iPhone 8 Hülle schwarz"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min={1}
                              value={article.quantity}
                              onChange={(e) => updateArticle(index, "quantity", parseInt(e.target.value) || 1)}
                              placeholder="1"
                            />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            {articles.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeArticle(index)}
                                className="h-9 w-9 p-0 text-red-500 hover:text-red-700"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addArticle}
                      className="flex items-center gap-2 w-full mt-3"
                    >
                      <Plus className="h-4 w-4" />
                      Artikel hinzufügen
                    </Button>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notizen (optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  // Standard Interface für Kundenbestellungen
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="articleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Artikel</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="z.B. iPhone 8 Hülle schwarz" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stückzahl</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preis (€)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
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
                          <FormLabel>Notizen (optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            </form>
          </Form>
        </div>
        
        <DialogFooter className="mt-4">
          {step === 1 && (
            <Button type="button" onClick={nextStep}>
              Weiter
            </Button>
          )}
          {step === 2 && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={prevStep}>
                Zurück
              </Button>
              <Button 
                type="button"
                onClick={() => {
                  const formData = form.getValues();
                  onSubmit(formData);
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Wird erstellt..." : "Erstellen"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}