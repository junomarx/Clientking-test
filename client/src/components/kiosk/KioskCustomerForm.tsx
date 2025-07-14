import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, Phone, MapPin, Save, X } from 'lucide-react';

interface CustomerFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  zipCode: string;
  city: string;
}

interface KioskCustomerFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function KioskCustomerForm({ onCancel, onSuccess }: KioskCustomerFormProps) {
  const { toast } = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    zipCode: '',
    city: ''
  });

  // Automatisches Fokussieren des ersten Eingabefelds für Tablet-Tastatur
  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
        // Zusätzlicher Trigger für iOS/Android
        firstInputRef.current.click();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest('POST', '/api/customers', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Kundendaten gespeichert',
        description: 'Ihre Daten wurden erfolgreich erfasst.',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: 'Beim Speichern der Kundendaten ist ein Fehler aufgetreten.',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast({
        title: 'Fehlende Daten',
        description: 'Bitte füllen Sie alle Pflichtfelder aus.',
        variant: 'destructive',
      });
      return;
    }

    createCustomerMutation.mutate(formData);
  };

  const isFormValid = formData.firstName.trim() && formData.lastName.trim() && formData.phone.trim();

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Kundendaten erfassen</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-gray-600 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-8 pb-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <Card className="w-full">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-6 w-6 text-blue-600" />
                Kundendaten erfassen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Erste Zeile: Vorname und Nachname */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName" className="text-lg font-medium">
                    Vorname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={firstInputRef}
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Ihr Vorname"
                    className="text-lg h-12 mt-2"
                    required
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="text"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-lg font-medium">
                    Nachname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Ihr Nachname"
                    className="text-lg h-12 mt-2"
                    required
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="text"
                  />
                </div>
              </div>

              {/* Zweite Zeile: Telefon und E-Mail */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="phone" className="text-lg font-medium">
                    Telefon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Ihre Telefonnummer"
                    className="text-lg h-12 mt-2"
                    type="tel"
                    required
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-lg font-medium">
                    E-Mail
                  </Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Ihre E-Mail-Adresse"
                    className="text-lg h-12 mt-2"
                    type="email"
                    autoCorrect="off"
                    spellCheck="false"
                    autoCapitalize="off"
                    inputMode="email"
                  />
                </div>
              </div>

              {/* Dritte Zeile: Straße und Hausnummer (volle Breite) */}
              <div>
                <Label htmlFor="address" className="text-lg font-medium">
                  Straße und Hausnummer
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Ihre Adresse"
                  className="text-lg h-12 mt-2"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="text"
                />
              </div>

              {/* Vierte Zeile: PLZ und Ort */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="zipCode" className="text-lg font-medium">
                    PLZ
                  </Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="Postleitzahl"
                    className="text-lg h-12 mt-2"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-lg font-medium">
                    Ort
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Ihr Wohnort"
                    className="text-lg h-12 mt-2"
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="text"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Action Bar */}
      <div className="bg-white border-t p-6 shrink-0">
        <div className="max-w-4xl mx-auto flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-6 py-2"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || createCustomerMutation.isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
          >
            {createCustomerMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Speichern...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Speichern
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}