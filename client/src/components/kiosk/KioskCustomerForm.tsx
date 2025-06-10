import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KioskCustomerFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function KioskCustomerForm({ onComplete, onCancel }: KioskCustomerFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFormValid = () => {
    return formData.firstName.trim() && formData.lastName.trim() && formData.phone.trim();
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: "Kunde erfolgreich registriert",
          description: "Ihre Daten wurden gespeichert.",
        });
        onComplete();
      } else {
        throw new Error('Fehler beim Speichern');
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Kunde konnte nicht registriert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <User className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-gray-900">
              Neue Kundenregistrierung
            </CardTitle>
            <p className="text-lg text-gray-600 mt-2">
              Bitte füllen Sie Ihre Kontaktdaten aus
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Vorname */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-lg font-medium">
                Vorname *
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Ihr Vorname"
                className="h-14 text-lg"
                autoComplete="given-name"
              />
            </div>

            {/* Nachname */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-lg font-medium">
                Nachname *
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Ihr Nachname"
                className="h-14 text-lg"
                autoComplete="family-name"
              />
            </div>

            {/* Telefonnummer */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-lg font-medium">
                Telefonnummer *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Ihre Telefonnummer"
                className="h-14 text-lg"
                autoComplete="tel"
              />
            </div>

            {/* E-Mail (optional) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg font-medium">
                E-Mail-Adresse <span className="text-gray-500">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="ihre.email@beispiel.de"
                className="h-14 text-lg"
                autoComplete="email"
              />
            </div>

            {/* Hinweis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Hinweis:</strong> Ihre Daten werden vertraulich behandelt und nur für die Reparaturabwicklung verwendet.
                Felder mit * sind Pflichtfelder.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-14 text-lg"
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Zurück
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || isSubmitting}
                className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  "Speichern..."
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Registrieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}