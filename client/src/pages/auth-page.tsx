import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";

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
    console.log('Login-Versuch mit Benutzer:', data.username);
    loginMutation.mutate(data);
    
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
    registerMutation.mutate(registerData);
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="grid md:grid-cols-2 w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Hero section - Left side with blue background */}
        <div className="hidden md:flex flex-col justify-center items-center p-12 bg-blue-500 text-white relative overflow-hidden">
          {/* Abstract wave pattern and dots background */}
          <div className="absolute inset-0 z-0 grid grid-cols-12 grid-rows-12 opacity-20">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="rounded-full bg-blue-200 w-2 h-2 m-4" style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                position: 'absolute'
              }}></div>
            ))}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-[20%] left-0 w-full h-40 bg-blue-300 rounded-[100%] opacity-20 transform -rotate-6 scale-150"></div>
              <div className="absolute bottom-[20%] left-0 w-full h-40 bg-blue-300 rounded-[100%] opacity-20 transform -rotate-6 scale-150"></div>
            </div>
          </div>
          
          {/* Company name at top */}
          <div className="absolute top-8 left-8 flex items-center z-10">
            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center mr-2">
              <div className="w-3 h-3 rounded-full bg-white"></div>
            </div>
            <span className="text-sm font-semibold tracking-wider">HANDYSHOP VERWALTUNG</span>
          </div>
          
          <div className="z-10 text-center">
            <p className="text-lg font-light mb-2">Schön, Sie wiederzusehen</p>
            <h1 className="text-5xl font-bold tracking-wide mb-8">WILLKOMMEN<br />ZURÜCK</h1>
            
            <div className="w-20 h-1 bg-white mx-auto my-6 rounded-full"></div>
            
            <p className="text-sm max-w-xs opacity-80 leading-relaxed">
              Verwalten Sie Ihre Reparaturaufträge, Kunden und Geräte einfach und effizient mit unserem Verwaltungssystem für Handyshops.
            </p>
          </div>
        </div>
        
        {/* Forms section - Right side with white background */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="register">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-gray-800">Login Account</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Melden Sie sich mit Ihren Zugangsdaten an, um auf Ihr Konto zuzugreifen.
                  </p>
                </div>
                
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Benutzername" 
                              {...field} 
                              className="h-12 px-4 border-gray-200 focus:border-blue-500"
                            />
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
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Passwort" 
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
                      className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full mt-6"
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
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-gray-800">Neues Konto erstellen</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Registrieren Sie Ihren Handyshop, um das Verwaltungssystem zu nutzen.
                  </p>
                </div>
                
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-5">
                    <div className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="Benutzername" 
                                {...field} 
                                className="h-12 px-4 border-gray-200 focus:border-blue-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Passwort" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
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
                                  placeholder="Passwort bestätigen" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <h3 className="text-base font-medium text-gray-700 mb-3">Firmeninformationen</h3>
                      
                      <div className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Ihre E-Mail-Adresse *" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
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
                              <FormControl>
                                <Input 
                                  placeholder="Firmenname *" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
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
                              <FormControl>
                                <Input 
                                  placeholder="Adresse" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="companyVatNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    placeholder="USt-IdNr." 
                                    {...field} 
                                    className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                  />
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
                                <FormControl>
                                  <Input 
                                    placeholder="Telefon" 
                                    {...field} 
                                    className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                  />
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
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Geschäfts-E-Mail" 
                                  {...field} 
                                  className="h-12 px-4 border-gray-200 focus:border-blue-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-4">
                      <p className="mb-2">Hinweis: Nach der Registrierung muss Ihr Konto von einem Administrator freigeschaltet werden, bevor Sie sich anmelden können.</p>
                      <p>Mit * markierte Felder sind Pflichtfelder.</p>
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
  );
}