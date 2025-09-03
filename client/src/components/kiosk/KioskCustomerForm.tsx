import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, X } from 'lucide-react';

// DSGVO-konforme Kundendaten-Struktur basierend auf shared/schema.ts
interface CustomerFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;    // Mapped von "street" im Originalcode
  zipCode: string;    // Mapped von "postalCode" im Originalcode  
  city: string;
}

interface KioskCustomerFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function KioskCustomerForm({ onCancel, onSuccess }: KioskCustomerFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    zipCode: '',
    city: ''
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Mobile Viewport (Keyboard) Handling -----------------------------------
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv || !containerRef.current) return;

    const el = containerRef.current;
    const onResize = () => {
      const keyboardOverlap = Math.max(0, window.innerHeight - vv.height);
      el.style.paddingBottom = `${keyboardOverlap + 16}px`;
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
      el.style.paddingBottom = "";
    };
  }, []);

  // Scrollt aktives Feld in Sicht, wenn Tastatur erscheint
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
    };
    document.addEventListener("focusin", handler);
    return () => document.removeEventListener("focusin", handler);
  }, []);

  const basicValid = useMemo(() => {
    return (
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      formData.phone.trim().length >= 6
    );
  }, [formData]);

  const handleChange =
    (key: keyof CustomerFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((d) => ({ ...d, [key]: e.target.value }));
    };

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
      setLoading(false);
    },
  });

  const handleSave = async () => {
    if (!basicValid) return;
    setLoading(true);
    createCustomerMutation.mutate(formData);
  };

  return (
    <div
      ref={containerRef}
      className="min-h-[100dvh] bg-gray-50 text-gray-900 fixed inset-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Header mit Buttons oben rechts */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Kundendaten erfassen</h1>
          <div className="flex gap-2">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  className="px-4 h-10 rounded-lg border border-gray-300 text-gray-800 text-sm font-medium"
                  onClick={() => setStep(2)}
                >
                  Adresse eingeben
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!basicValid || loading}
                  className="px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? "Speichern…" : "Speichern"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="px-4 h-10 rounded-lg border border-gray-300 text-gray-800 text-sm font-medium"
                  onClick={() => setStep(1)}
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!basicValid || loading}
                  className="px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? "Speichern…" : "Speichern"}
                </button>
              </>
            )}
            <button
              onClick={onCancel}
              className="px-3 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </header>

      {/* Inhalt */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        {step === 1 ? (
          <Section title="Grunddaten">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label="Vorname *"
                placeholder="Ihr Vorname"
                value={formData.firstName}
                onChange={handleChange("firstName")}
                autoFocus
                autoComplete="given-name"
                inputMode="text"
              />
              <Field
                label="Nachname *"
                placeholder="Ihr Nachname"
                value={formData.lastName}
                onChange={handleChange("lastName")}
                autoComplete="family-name"
                inputMode="text"
              />
              <Field
                label="Telefon *"
                placeholder="Ihre Telefonnummer"
                value={formData.phone}
                onChange={handleChange("phone")}
                autoComplete="tel"
                inputMode="tel"
                pattern="[0-9+() -]*"
              />
              <Field
                label="E-Mail"
                placeholder="Ihre E-Mail-Adresse"
                value={formData.email}
                onChange={handleChange("email")}
                autoComplete="email"
                inputMode="email"
                type="email"
              />
            </div>
          </Section>
        ) : (
          <Section title="Adresse (optional)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Field
                  label="Straße und Hausnummer"
                  placeholder="Ihre Adresse"
                  value={formData.address}
                  onChange={handleChange("address")}
                  autoComplete="street-address"
                  inputMode="text"
                />
              </div>
              <Field
                label="PLZ"
                placeholder="Postleitzahl"
                value={formData.zipCode}
                onChange={handleChange("zipCode")}
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <Field
                label="Ort"
                placeholder="Ihr Wohnort"
                value={formData.city}
                onChange={handleChange("city")}
                autoComplete="address-level2"
                inputMode="text"
              />
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

// ----------------- Hilfskomponenten -----------------
function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "numeric" | "decimal";
  type?: string;
  pattern?: string;
};

function Field({ label, placeholder, value, onChange, autoFocus, autoComplete, inputMode = "text", type = "text", pattern }: FieldProps) {
  const id = useMemo(() => "f_" + Math.random().toString(36).slice(2, 9), []);
  return (
    <label htmlFor={id} className="block">
      <div className="text-base font-medium mb-2">{label}</div>
      <input
        id={id}
        type={type}
        inputMode={inputMode as any}
        pattern={pattern}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-14 text-lg px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 placeholder:text-gray-400 bg-white"
      />
    </label>
  );
}