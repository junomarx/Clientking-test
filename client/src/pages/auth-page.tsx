import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link, useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import logoNewPath from "@assets/logo_new2.png";

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";

// Login schema - unterstützt normalen und Mitarbeiter-Login
const loginSchema = z.object({
  email: z.string().min(3, "E-Mail oder Benutzername ist erforderlich."),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben."),
  isEmployeeLogin: z.boolean().default(false),
  ownerUsername: z.string().optional(),
  employeeCredential: z.string().optional(),
}).refine((data) => {
  if (data.isEmployeeLogin) {
    return data.ownerUsername && data.ownerUsername.length >= 3 && 
           data.employeeCredential && data.employeeCredential.length >= 3;
  }
  return true;
}, {
  message: "Bei Mitarbeiter-Login sind Owner-Benutzername und Mitarbeiter-Benutzername erforderlich.",
  path: ["ownerUsername"],
});

// Register schema - vereinfacht basierend auf dem gewünschten Design
const registerSchema = z.object({
  // Persönliche Daten
  ownerFirstName: z.string().min(2, "Vorname ist erforderlich."),
  ownerLastName: z.string().min(2, "Nachname ist erforderlich."),
  
  // Adressdaten
  streetAddress: z.string().min(2, "Straße ist erforderlich."),
  zipCode: z.string().min(2, "PLZ ist erforderlich."),
  city: z.string().min(2, "Ort ist erforderlich."),
  country: z.string().min(2, "Land ist erforderlich.").default("Österreich"),
  
  // Firmen- und Kontaktdaten
  companyName: z.string().min(2, "Firmenname ist erforderlich."),
  website: z.string().optional(),
  companyPhone: z.string().min(2, "Telefonnummer ist erforderlich."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  taxId: z.string().min(2, "UID-Nummer ist erforderlich."),
  
  // Login-Daten
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben."),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein.",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [location] = useLocation();
  const [isSuperadminLogin, setIsSuperadminLogin] = useState(false);
  
  // State für Dialog und Tab-Steuerung
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const [isEmployeeLogin, setIsEmployeeLogin] = useState(false);
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      isEmployeeLogin: false,
      ownerUsername: "",
      employeeCredential: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      ownerFirstName: "",
      ownerLastName: "",
      streetAddress: "",
      zipCode: "",
      city: "",
      country: "Österreich",
      companyName: "",
      website: "",
      companyPhone: "",
      email: "",
      taxId: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Prüfen ob der "superadmin" Parameter in der URL vorhanden ist
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuperadmin = params.get('superadmin') === 'true';
    setIsSuperadminLogin(isSuperadmin);
    
    if (isSuperadmin) {
      // Voreintragen der Superadmin-Zugangsdaten
      loginForm.setValue('email', 'macnphone');
      // Passwort hier absichtlich nicht vorausgefüllt - aus Sicherheitsgründen
      // loginForm.setValue('password', '...'); 
      
      // Zeige Focus auf Passwortfeld
      setTimeout(() => {
        const passwordInput = document.querySelector('input[type="password"]');
        if (passwordInput) {
          (passwordInput as HTMLInputElement).focus();
        }
      }, 100);
    }
  }, [location, loginForm]);
  
  // Redirect wenn bereits eingeloggt - nach allen Hook-Aufrufen
  if (user) {
    return <Redirect to="/" />;
  }
  
  function onLoginSubmit(data: LoginFormValues) {
    if (isEmployeeLogin) {
      // Mitarbeiter-Login: verwende hierarchische Struktur
      console.log('Mitarbeiter-Login-Versuch für Shop-Owner:', data.ownerUsername, 'Mitarbeiter:', data.employeeCredential);
      const employeeLoginData = {
        email: data.employeeCredential || '', // Mitarbeiter-Benutzername/E-Mail
        password: data.password,
        ownerUsername: data.ownerUsername // Zusätzliches Feld für Shop-Identifikation
      };
      loginMutation.mutate(employeeLoginData);
    } else {
      // Normaler Login wie bisher
      console.log('Standard-Login-Versuch mit E-Mail/Benutzername:', data.email);
      loginMutation.mutate({
        email: data.email,
        password: data.password
      });
    }
    
    // Nach der erfolgreichen Anmeldung prüfen wir, ob die userId im localStorage vorhanden ist
    setTimeout(() => {
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      console.log('Nach Login: userId im localStorage:', userId, 'username:', username);
      if (!userId) {
        console.warn('WARNUNG: userId nicht im localStorage nach Login gefunden!');
      }
    }, 1000);
  }
  
  function onRegisterSubmit(data: RegisterFormValues) {
    const { confirmPassword, ...registerData } = data;
    console.log("📤 Frontend sendet Registrierungsdaten:", registerData);
    console.log("📊 Feld-Check:", {
      ownerFirstName: !!registerData.ownerFirstName,
      ownerLastName: !!registerData.ownerLastName,
      streetAddress: !!registerData.streetAddress,
      zipCode: !!registerData.zipCode,
      city: !!registerData.city,
      country: !!registerData.country,
      companyName: !!registerData.companyName,
      email: !!registerData.email,
      taxId: !!registerData.taxId,
      username: !!registerData.username,
      password: !!registerData.password
    });
    
    registerMutation.mutate(registerData, {
      onSuccess: () => {
        console.log("✅ Registrierung erfolgreich!");
        // Dialog öffnen
        setIsSuccessDialogOpen(true);
      },
      onError: (error) => {
        console.error("❌ Registrierung fehlgeschlagen:", error);
      }
    });
  }
  
  // Funktion zum Zurücksetzen und Wechseln zum Login-Tab
  function handleDialogClose() {
    // Dialog schließen
    setIsSuccessDialogOpen(false);
    
    // Formular zurücksetzen
    registerForm.reset({
      ownerFirstName: "",
      ownerLastName: "",
      streetAddress: "",
      zipCode: "",
      city: "",
      country: "Österreich",
      companyName: "",
      website: "",
      companyPhone: "",
      email: "",
      taxId: "",
      username: "",
      password: "",
      confirmPassword: "",
    });
    
    // Zum Login-Tab wechseln
    setActiveTab("login");
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Erfolgsdialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Registrierung erfolgreich
            </DialogTitle>
            <DialogDescription>
              Vielen Dank für Ihre Registrierung. Ihr Konto muss nun von einem Administrator freigeschaltet werden, bevor Sie sich anmelden können. Sie werden per E-Mail benachrichtigt, sobald Ihr Konto aktiviert wurde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleDialogClose} className="w-full">
              Verstanden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="grid md:grid-cols-2 w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Logo section - Left side */}
          <div className="hidden md:flex flex-col justify-center items-center p-12 bg-gray-50">
            <img 
              src={logoNewPath} 
              alt="ClientKing Handyshop Verwaltung" 
              className="w-80 h-auto"
            />
          </div>
          
          {/* Forms section - Right side with white background */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              ref={tabsRef} 
              className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="register">Registrieren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    {isSuperadminLogin ? (
                      <>
                        <div className="flex items-center justify-center mb-2">
                          <ShieldAlert className="h-8 w-8 text-red-500 mr-2" />
                          <h2 className="text-2xl font-semibold text-red-600">Superadmin Login</h2>
                        </div>
                        <p className="text-gray-500 text-sm mt-2">
                          Anmeldung als globaler System-Administrator (macnphone).
                          <br />Bitte geben Sie Ihr Passwort ein.
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl font-semibold text-gray-800">Login Account</h2>
                        <p className="text-gray-500 text-sm mt-2">
                          Melden Sie sich mit Ihren Zugangsdaten an, um auf Ihr Konto zuzugreifen.
                        </p>
                      </>
                    )}
                  </div>
                  
                  {/* Mitarbeiter-Login Toggle Button */}
                  <div className="mb-6">
                    <Button
                      type="button"
                      variant={isEmployeeLogin ? "default" : "outline"}
                      onClick={() => {
                        setIsEmployeeLogin(!isEmployeeLogin);
                        // Formular zurücksetzen beim Wechsel
                        loginForm.reset({
                          email: "",
                          password: "",
                          ownerUsername: "",
                          employeeCredential: "",
                          isEmployeeLogin: !isEmployeeLogin,
                        });
                      }}
                      className="w-full h-12 mb-4"
                    >
                      {isEmployeeLogin ? "Als Shop-Owner anmelden" : "Als Mitarbeiter anmelden"}
                    </Button>
                  </div>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                      {/* Erstes Feld: Shop-Owner Benutzername (bei Mitarbeiter-Login) oder E-Mail/Benutzername (bei normalem Login) */}
                      {isEmployeeLogin ? (
                        <FormField
                          control={loginForm.control}
                          name="ownerUsername"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Shop-Owner Benutzername *" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="E-Mail oder Benutzername *" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Zweites Feld: Mitarbeiter-Benutzername (nur bei Mitarbeiter-Login) */}
                      {isEmployeeLogin && (
                        <FormField
                          control={loginForm.control}
                          name="employeeCredential"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Mitarbeiter E-Mail oder Benutzername *" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Drittes Feld: Passwort */}
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder={isEmployeeLogin ? "Mitarbeiter-Passwort *" : "Passwort *"} 
                                {...field} 
                                className="h-12 px-4 border-gray-200 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="keep-signed" className="rounded text-blue-500 focus:ring-blue-500" />
                          <label htmlFor="keep-signed" className="text-sm text-gray-600">Angemeldet bleiben</label>
                        </div>
                        <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline">Passwort vergessen?</Link>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className={`w-full h-12 ${isSuperadminLogin 
                          ? "bg-red-500 hover:bg-red-600" 
                          : "bg-blue-500 hover:bg-blue-600"} text-white rounded-full mt-6`}
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Wird angemeldet...
                          </>
                        ) : (
                          <>
                            {isSuperadminLogin && <ShieldAlert className="mr-2 h-4 w-4" />}
                            {isSuperadminLogin ? "Als Superadmin anmelden" : "Anmelden"}
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>
              
              <TabsContent value="register">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Neues Konto erstellen</h2>
                    <p className="text-gray-500 text-sm mt-2">
                      Registrieren Sie Ihren Handyshop mit den wichtigsten Daten.
                    </p>
                  </div>
                  
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
                      {/* Name */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="ownerFirstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Vorname *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="ownerLastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Nachname *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Adresse */}
                      <FormField
                        control={registerForm.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Straße und Hausnummer *" 
                                {...field} 
                                className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Postleitzahl *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Ort *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Land *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Firma */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Firma *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Website" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Telefon */}
                      <FormField
                        control={registerForm.control}
                        name="companyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Telefon *" 
                                {...field} 
                                className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* E-Mail */}
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="E-Mail Adresse *" 
                                {...field} 
                                className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1 italic">
                              An die angegebene E-Mail Adresse schicken wir Ihnen eine Bestätigungsmail.
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* UID-Nummer */}
                      <FormField
                        control={registerForm.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="UID-Nummer (z.B. ATU12345678) *" 
                                {...field} 
                                className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Ihre Umsatzsteuer-Identifikationsnummer für Geschäftskunden
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Benutzername */}
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Benutzername *" 
                                {...field} 
                                className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Wird für den Login benötigt. Kann nach der Registrierung nicht mehr geändert werden.
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Passwort */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Passwort *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Passwort wiederholen *" 
                                  {...field} 
                                  className="h-14 px-4 text-base border-gray-300 rounded-lg focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-4">
                        <p className="mb-2">Hinweis: Nach der Registrierung muss Ihr Konto von einem Administrator freigeschaltet werden, bevor Sie sich anmelden können.</p>
                        <p>Alle Felder sind Pflichtfelder.</p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full mt-6"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Wird registriert...
                          </>
                        ) : (
                          "Registrieren"
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}