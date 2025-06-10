import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, MapPin, Save, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung der Pflichtfelder
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      toast({
        title: 'Pflichtfelder fehlen',
        description: 'Bitte füllen Sie mindestens Vorname, Nachname und Telefon aus.',
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
      <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8" />
          <h1 className="text-2xl font-semibold">Kundendaten erfassen</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white hover:bg-blue-500"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Form Content - Fixed Height, No Scroll */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-blue-600" />
              Persönliche Daten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Persönliche Daten */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-lg font-medium">
                    Vorname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Ihr Vorname"
                    className="text-lg h-12 mt-2"
                    required
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
                  />
                </div>
              </div>

              {/* Kontaktdaten */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Kontaktdaten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Adresse
                </h3>
                <div className="space-y-4">
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
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onCancel}
                  className="px-8 py-3 text-lg"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!isFormValid || createCustomerMutation.isPending}
                  className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  {createCustomerMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Speichern...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      Speichern
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}