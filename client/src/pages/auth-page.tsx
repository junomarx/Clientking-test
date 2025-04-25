import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

// Login schema
const loginSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben."),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben."),
});

// Register schema
const registerSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben."),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben."),
  confirmPassword: z.string(),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  companyName: z.string().min(2, "Bitte geben Sie einen Firmennamen ein."),
  companyAddress: z.string().optional(),
  companyVatNumber: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email("Bitte geben Sie eine gültige Geschäfts-E-Mail-Adresse ein.").optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein.",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      companyName: "",
      companyAddress: "",
      companyVatNumber: "",
      companyPhone: "",
      companyEmail: "",
    },
  });
  
  // Redirect wenn bereits eingeloggt
  if (user) {
    return <Redirect to="/" />;
  }
  
  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate(data);
  }
  
  function onRegisterSubmit(data: RegisterFormValues) {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Hero section */}
        <div className="hidden md:flex flex-col justify-center items-center p-8 bg-gradient-to-br from-primary to-primary-foreground text-primary-foreground">
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-bold">Handyshop Verwaltung</h1>
            <p className="text-lg opacity-90">
              Willkommen bei Ihrem System zur Verwaltung von Reparaturaufträgen, Kunden und Geräten
            </p>
            <div className="pt-4">
              <ul className="space-y-2 list-disc list-inside text-left">
                <li>Reparaturaufträge verwalten</li>
                <li>Kundendaten pflegen</li>
                <li>Statusaktualisierungen</li>
                <li>Reparaturbestätigungen drucken</li>
                <li>Berichterstellung</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Forms section */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-center mb-6 md:hidden">Handyshop Verwaltung</h2>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="register">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Anmelden</CardTitle>
                  <CardDescription>
                    Melden Sie sich mit Ihrem Benutzerkonto an
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benutzername</FormLabel>
                            <FormControl>
                              <Input placeholder="Benutzername eingeben" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passwort</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Passwort eingeben" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-2"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Wird angemeldet...
                          </>
                        ) : (
                          "Anmelden"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Registrieren</CardTitle>
                  <CardDescription>
                    Erstellen Sie ein neues Benutzerkonto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benutzername</FormLabel>
                            <FormControl>
                              <Input placeholder="Benutzername eingeben" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passwort</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Passwort eingeben" {...field} />
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
                            <FormLabel>Passwort bestätigen</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Passwort wiederholen" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2 my-4">
                        <h3 className="text-base font-medium">Firmeninformationen</h3>
                        <p className="text-sm text-muted-foreground">Diese Informationen werden für Ihr Konto benötigt. Sie können später im Administrationsbereich geändert werden.</p>
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Mail-Adresse *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Ihre E-Mail-Adresse" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Firmenname *</FormLabel>
                            <FormControl>
                              <Input placeholder="Name Ihres Unternehmens" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="companyAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse</FormLabel>
                            <FormControl>
                              <Input placeholder="Straße, Hausnummer, PLZ, Ort" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="companyVatNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>USt-IdNr.</FormLabel>
                              <FormControl>
                                <Input placeholder="z.B. ATU12345678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="companyPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefon</FormLabel>
                              <FormControl>
                                <Input placeholder="Telefonnummer" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="companyEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geschäfts-E-Mail</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="E-Mail für Geschäftskunden" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="text-sm text-muted-foreground mt-4">
                        <p className="mb-2">Hinweis: Nach der Registrierung muss Ihr Konto von einem Administrator freigeschaltet werden, bevor Sie sich anmelden können.</p>
                        <p>Mit * markierte Felder sind Pflichtfelder.</p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-4"
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}