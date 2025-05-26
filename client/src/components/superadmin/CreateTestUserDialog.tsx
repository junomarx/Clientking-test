import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, UserPlus } from 'lucide-react';

const testUserSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben"),
  email: z.string().email("Gültige E-Mail-Adresse eingeben"),
  companyName: z.string().min(2, "Firmenname erforderlich"),
  ownerFirstName: z.string().min(2, "Vorname erforderlich"),
  ownerLastName: z.string().min(2, "Nachname erforderlich"),
  streetAddress: z.string().min(2, "Adresse erforderlich"),
  zipCode: z.string().min(2, "PLZ erforderlich"),
  city: z.string().min(2, "Stadt erforderlich"),
  country: z.string().default("Österreich"),
  companyPhone: z.string().min(2, "Telefon erforderlich"),
  taxId: z.string().min(2, "UID erforderlich"),
  website: z.string().optional(),
  isActive: z.boolean().default(false),
});

type TestUserForm = z.infer<typeof testUserSchema>;

interface CreateTestUserDialogProps {
  children: React.ReactNode;
}

export function CreateTestUserDialog({ children }: CreateTestUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<TestUserForm>({
    resolver: zodResolver(testUserSchema),
    defaultValues: {
      username: "",
      email: "",
      companyName: "",
      ownerFirstName: "",
      ownerLastName: "",
      streetAddress: "",
      zipCode: "",
      city: "",
      country: "Österreich",
      companyPhone: "",
      taxId: "",
      website: "",
      isActive: false,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: TestUserForm) => {
      const response = await apiRequest("POST", "/api/superadmin/create-test-user", {
        ...data,
        password: "TestPass123!" // Standard-Passwort für Testbenutzer
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Testbenutzer erstellt",
        description: "Der Testbenutzer wurde erfolgreich erstellt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Erstellen",
        description: error.message || "Der Testbenutzer konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TestUserForm) => {
    createUserMutation.mutate(data);
  };

  // Schnellfüll-Funktionen für Testdaten
  const fillTestData = (type: 'handyshop' | 'reparatur' | 'electronic') => {
    const testData = {
      handyshop: {
        username: `handyshop${Date.now()}`,
        email: `test@handyshop${Date.now()}.at`,
        companyName: "Handyshop Test GmbH",
        ownerFirstName: "Hans",
        ownerLastName: "Mustermann",
        streetAddress: "Teststraße 123",
        zipCode: "1010",
        city: "Wien",
        companyPhone: "01234567890",
        taxId: `ATU${Math.floor(Math.random() * 100000000)}`,
        website: "https://handyshop-test.at",
      },
      reparatur: {
        username: `reparatur${Date.now()}`,
        email: `service@reparatur${Date.now()}.at`,
        companyName: "Handy Reparatur Service",
        ownerFirstName: "Maria",
        ownerLastName: "Schneider",
        streetAddress: "Reparaturstraße 456",
        zipCode: "1020",
        city: "Wien",
        companyPhone: "01987654321",
        taxId: `ATU${Math.floor(Math.random() * 100000000)}`,
        website: "https://reparatur-service.at",
      },
      electronic: {
        username: `electronic${Date.now()}`,
        email: `info@electronic${Date.now()}.at`,
        companyName: "Electronic Pro Center",
        ownerFirstName: "Thomas",
        ownerLastName: "Weber",
        streetAddress: "Elektronikgasse 789",
        zipCode: "1030",
        city: "Wien",
        companyPhone: "01555666777",
        taxId: `ATU${Math.floor(Math.random() * 100000000)}`,
        website: "https://electronic-pro.at",
      },
    };

    const data = testData[type];
    Object.entries(data).forEach(([key, value]) => {
      form.setValue(key as keyof TestUserForm, value);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Testbenutzer erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie schnell einen Testbenutzer für Entwicklung und Tests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Schnellfüll-Buttons */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600 mb-2 w-full">Schnellfüll-Optionen:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillTestData('handyshop')}
            >
              Handyshop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillTestData('reparatur')}
            >
              Reparaturdienst
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillTestData('electronic')}
            >
              Elektronik-Center
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benutzername</FormLabel>
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
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firmenname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ownerFirstName"
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
                  name="ownerLastName"
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
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PLZ</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stadt</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyPhone"
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
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UID-Nummer</FormLabel>
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Benutzer direkt aktivieren
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Wenn aktiviert, kann sich der Benutzer sofort anmelden
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Testbenutzer erstellen
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}