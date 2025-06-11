import { useState } from 'react';
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
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    zipCode: '',
    city: ''
  });

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
      <div className="flex-1 overflow-y-auto p-4 pb-20 bg-white">
        <div className="max-w-xl mx-auto">
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Persönliche Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Persönliche Daten */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="firstName" className="text-base font-medium">
                    Vorname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Ihr Vorname"
                    className="text-base h-10 mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-base font-medium">
                    Nachname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Ihr Nachname"
                    className="text-base h-10 mt-1"
                    required
                  />
                </div>
              </div>

              {/* Kontaktdaten */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-base font-medium mb-3">
                  <Phone className="h-4 w-4 text-blue-600" />
                  Kontaktdaten
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="phone" className="text-base font-medium">
                      Telefon <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Ihre Telefonnummer"
                      className="text-base h-10 mt-1"
                      type="tel"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-base font-medium">
                      E-Mail
                    </Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Ihre E-Mail-Adresse"
                      className="text-base h-10 mt-1"
                      type="email"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-base font-medium mb-3">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Adresse
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="address" className="text-base font-medium">
                      Straße und Hausnummer
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Ihre Adresse"
                      className="text-base h-10 mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="zipCode" className="text-base font-medium">
                        PLZ
                      </Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        placeholder="Postleitzahl"
                        className="text-base h-10 mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-base font-medium">
                        Ort
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Ihr Wohnort"
                        className="text-base h-10 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Action Bar */}
      <div className="bg-white border-t p-4 shrink-0">
        <div className="max-w-xl mx-auto flex justify-end gap-3">
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