import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, CalendarIcon } from 'lucide-react';

interface CreateCostEstimateFormProps {
  onSuccess?: () => void;
}

export default function CreateCostEstimateForm({ onSuccess }: CreateCostEstimateFormProps) {
  const { toast } = useToast();
  
  // Standard-Gültigkeitsdatum (14 Tage ab heute)
  const defaultValidUntil = addDays(new Date(), 14);
  const formattedDate = format(defaultValidUntil, "PPP", { locale: de });
  
  // Dummy-Handler für Formularabsendung
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Formular wurde abgesendet",
      description: "Ihre Daten wurden erfolgreich gespeichert."
    });
    if (onSuccess) onSuccess();
  };
  
  // Einfacher zurück-Button Handler
  const handleBack = () => {
    if (onSuccess) onSuccess();
  };
  
  return (
    <div className="font-sans max-w-4xl mx-auto p-4"
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-lg font-bold">Neuen Kostenvoranschlag erstellen</h2>
            <p className="text-gray-600 text-xs">Erstellen Sie einen neuen Kostenvoranschlag für einen Kunden.</p>
          </div>
          <button 
            type="button" 
            className="text-gray-500 hover:text-gray-700"
            onClick={() => window.history.back()}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[#f9f9f9] rounded-lg p-3 border border-[#ddd] mb-3">
          <h2 className="text-base font-bold border-b border-[#ddd] pb-2 mb-3">Kundendaten</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1">Vorname*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      className="w-full h-9 border border-[#ddd] rounded" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1">Nachname*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      className="w-full h-9 border border-[#ddd] rounded" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="mb-3">
                <FormLabel className="block text-sm font-medium mb-1">Adresse*</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    className="w-full h-9 border border-[#ddd] rounded" 
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1">PLZ*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      className="w-full h-9 border border-[#ddd] rounded" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1">Ort*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      className="w-full h-9 border border-[#ddd] rounded" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1">Telefonnummer*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      className="w-full h-9 border border-[#ddd] rounded" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1">E-Mail*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="email"
                      className="w-full h-9 border border-[#ddd] rounded" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-3">
            <FormLabel className="block text-sm font-medium mb-1">Gültig bis*</FormLabel>
            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="w-full h-9 justify-start text-left border border-[#ddd] rounded"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: de })
                          ) : (
                            <span>Datum wählen</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Gerätedaten */}
        <div className="bg-[#f9f9f9] rounded-lg p-3 border border-[#ddd] mb-3">
          <h2 className="text-sm font-bold border-b border-[#ddd] pb-1 mb-2">Gerätedaten</h2>
          
          <div className="flex flex-wrap -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Gerätetyp*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md">
                          <SelectValue placeholder="z.B. Smartphone, Laptop, Tablet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Smartphone">Smartphone</SelectItem>
                        <SelectItem value="Tablet">Tablet</SelectItem>
                        <SelectItem value="Laptop">Laptop</SelectItem>
                        <SelectItem value="Watch">Watch</SelectItem>
                        <SelectItem value="Spielekonsole">Spielekonsole</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Hersteller*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Modell*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Seriennummer</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Fehlerbeschreibung und Arbeiten */}
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm border border-[#ddd]">
          <h2 className="text-[18px] font-bold text-[#2c3e50] border-b border-[#ddd] pb-2.5 mb-5">Fehlerbeschreibung und Arbeiten</h2>
          
          <div className="mb-4">
            <FormField
              control={form.control}
              name="issue"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel className="block font-bold mb-1 text-[14px]">Fehlerbeschreibung*</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="w-full min-h-[100px] px-2 py-2 border border-[#ddd] rounded-md resize-vertical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-4">
            <FormField
              control={form.control}
              name={`items.0.description`}
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel className="block font-bold mb-1 text-[14px]">Durchzuführende Arbeiten*</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="w-full min-h-[100px] px-2 py-2 border border-[#ddd] rounded-md resize-vertical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex flex-wrap -mx-2">
            <div className="w-full px-2">
              <FormField
                control={form.control}
                name={`items.0.unitPrice`}
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Gesamtpreis (€)*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="z.B. 150,00 €"
                        onBlur={(e) => {
                          field.onChange(formatPrice(e.target.value));
                          updateTotalPrice(0);
                        }}
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Absenden-Buttons */}
        <div className="text-center mt-8">
          <Button 
            type="reset" 
            className="mx-2 bg-[#e74c3c] hover:bg-[#c0392b] text-white border-none rounded-md px-5 py-2.5 text-[16px]"
            onClick={() => form.reset()}
          >
            Formular zurücksetzen
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending} 
            className="mx-2 bg-[#2ecc71] hover:bg-[#27ae60] text-white border-none rounded-md px-5 py-2.5 text-[16px]"
          >
            {createMutation.isPending ? 
              "Wird erstellt..." : 
              "Kostenvoranschlag erstellen"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}