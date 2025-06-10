import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Mail, MapPin, FileText, ArrowRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  notes: string;
}

interface KioskCustomerFormProps {
  onSubmit: (customerData: CustomerData) => void;
  onCancel: () => void;
}

export function KioskCustomerForm({ onSubmit, onCancel }: KioskCustomerFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    deviceType: '',
    brand: '',
    model: '',
    issue: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerData> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich';
    if (!formData.lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich';
    if (!formData.phone.trim()) newErrors.phone = 'Telefonnummer ist erforderlich';
    if (!formData.deviceType.trim()) newErrors.deviceType = 'Gerätetyp ist erforderlich';
    if (!formData.brand.trim()) newErrors.brand = 'Marke ist erforderlich';
    if (!formData.issue.trim()) newErrors.issue = 'Problembeschreibung ist erforderlich';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
      toast({
        title: 'Daten erfasst',
        description: 'Ihre Daten wurden erfolgreich übermittelt.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center">
                <User className="mr-3 h-8 w-8" />
                Kundendaten erfassen
              </CardTitle>
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Persönliche Daten */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="mr-2 h-5 w-5 text-blue-600" />
                  Persönliche Daten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>
              </div>

              {/* Kontaktdaten */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Phone className="mr-2 h-5 w-5 text-blue-600" />
                  Kontaktdaten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-blue-600" />
                  Adresse
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Straße und Hausnummer</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="zipCode">PLZ</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="city">Ort</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Gerätedaten */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-600" />
                  Gerätedaten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="deviceType">Gerätetyp *</Label>
                    <Input
                      id="deviceType"
                      value={formData.deviceType}
                      onChange={(e) => handleInputChange('deviceType', e.target.value)}
                      placeholder="z.B. Smartphone, Tablet"
                      className={errors.deviceType ? 'border-red-500' : ''}
                    />
                    {errors.deviceType && <p className="text-red-500 text-sm mt-1">{errors.deviceType}</p>}
                  </div>
                  <div>
                    <Label htmlFor="brand">Marke *</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      placeholder="z.B. Apple, Samsung"
                      className={errors.brand ? 'border-red-500' : ''}
                    />
                    {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
                  </div>
                  <div>
                    <Label htmlFor="model">Modell</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="z.B. iPhone 14, Galaxy S23"
                    />
                  </div>
                </div>
              </div>

              {/* Problem */}
              <div>
                <Label htmlFor="issue">Problembeschreibung *</Label>
                <textarea
                  id="issue"
                  value={formData.issue}
                  onChange={(e) => handleInputChange('issue', e.target.value)}
                  className={`w-full min-h-[100px] p-3 border rounded-md resize-none ${errors.issue ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Beschreiben Sie das Problem mit Ihrem Gerät..."
                />
                {errors.issue && <p className="text-red-500 text-sm mt-1">{errors.issue}</p>}
              </div>

              {/* Notizen */}
              <div>
                <Label htmlFor="notes">Zusätzliche Notizen</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none"
                  placeholder="Weitere Informationen (optional)..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="px-8"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="px-8 bg-blue-600 hover:bg-blue-700"
                >
                  Weiter zur Unterschrift
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}