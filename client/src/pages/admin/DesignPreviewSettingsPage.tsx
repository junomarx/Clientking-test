import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Menu, Settings, Eye, Save, BarChart, Users, Mail, Smartphone, User, Building, Phone, Map, MapPin, Clock, Calendar, FileText, DollarSign, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock-Daten für Geschäftseinstellungen
const MOCK_BUSINESS_SETTINGS = {
  businessName: "Mac and Phone Service GmbH",
  ownerName: "Max Mustermann",
  address: "Hauptstraße 123",
  city: "Berlin",
  zipCode: "10115",
  country: "Deutschland",
  phone: "+49 30 12345678",
  email: "info@macandphone.de",
  website: "www.macandphone.de",
  taxId: "DE123456789",
  bankAccount: "DE89 3704 0044 0532 0130 00",
  bankName: "Mustermann Bank",
  logoUrl: "",
  businessHours: "Mo-Fr: 9:00-18:00, Sa: 10:00-14:00",
  customFooterText: "Vielen Dank für Ihr Vertrauen!"
};

// Mock-Daten für E-Mail-Einstellungen
const MOCK_EMAIL_SETTINGS = {
  smtpHost: "smtp.example.com",
  smtpPort: "587",
  smtpUser: "info@macandphone.de",
  smtpPassword: "********",
  senderName: "Mac and Phone Service",
  senderEmail: "info@macandphone.de",
  emailSignature: "<p>Mit freundlichen Grüßen,<br>Ihr Team von Mac and Phone Service</p>"
};

export default function DesignPreviewSettingsPage() {
  // State für Sidebare Toggle
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("business");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Seitenleiste - fixiert am linken Rand in dunkler Farbe */}
      <div 
        className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white fixed h-full transition-all duration-300 ease-in-out z-30`}
        style={{ paddingLeft: collapsed ? '0.75rem' : '1.5rem', paddingRight: collapsed ? '0.75rem' : '1.5rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
      >
        <div className="mb-8 flex items-center justify-center md:justify-start">
          {collapsed ? (
            <div className="flex justify-center w-full">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold">
                HS
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-bold">HandyShop</h2>
          )}
        </div>
        
        <nav className="space-y-4">
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <Menu className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Dashboard</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {!collapsed && <span className="ml-3">Reparaturen</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {!collapsed && <span className="ml-3">Kunden</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <BarChart className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Statistik</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <Mail className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">E-Mails</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md bg-gray-800 text-blue-400 font-medium">
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Einstellungen</span>}
          </div>
        </nav>
      </div>
      
      {/* Toggle Button für die Seitenleiste */}
      <div 
        className={`fixed z-40 bg-gray-900 text-white rounded-full flex items-center justify-center w-6 h-6 cursor-pointer transition-all duration-300 ease-in-out ${collapsed ? 'left-14' : 'left-60'}`}
        style={{ top: '1.5rem' }} 
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>

      {/* Hauptbereich - über gesamte Breite minus Seitenleiste */}
      <div className={`${collapsed ? 'ml-16' : 'ml-64'} flex-1 w-full transition-all duration-300 ease-in-out overflow-auto`}>
        {/* Header - über volle Breite */}
        <div className="p-4 md:p-6 flex justify-between items-center border-b shadow-sm bg-white sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-semibold">Einstellungen</h1>
            <p className="text-sm text-gray-500">Konfigurieren Sie Ihr Geschäft</p>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button variant="outline" size="sm" className="hidden md:flex items-center">
              <Save className="h-4 w-4 mr-2" /> Speichern
            </Button>
            <div className="flex items-center">
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-800 font-medium">BG</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="bg-gray-50 min-h-[calc(100vh-73px)]">
          <div className="p-4 md:p-6">
            <Tabs defaultValue="business" className="w-full" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex overflow-x-auto">
                <TabsList className="bg-white border mb-6">
                  <TabsTrigger value="business">Geschäft</TabsTrigger>
                  <TabsTrigger value="emails">E-Mail</TabsTrigger>
                  <TabsTrigger value="appearance">Erscheinungsbild</TabsTrigger>
                  <TabsTrigger value="prints">Ausdrucke</TabsTrigger>
                  <TabsTrigger value="subscription">Abonnement</TabsTrigger>
                </TabsList>
              </div>

              {/* Geschäftseinstellungen Tab */}
              <TabsContent value="business" className="mt-4">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Geschäftsinformationen</CardTitle>
                    <CardDescription>Informationen über Ihr Unternehmen, die auf Rechnungen und Angeboten angezeigt werden.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Geschäftsname</Label>
                        <Input id="businessName" defaultValue={MOCK_BUSINESS_SETTINGS.businessName} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ownerName">Inhaber</Label>
                        <Input id="ownerName" defaultValue={MOCK_BUSINESS_SETTINGS.ownerName} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address">Adresse</Label>
                        <Input id="address" defaultValue={MOCK_BUSINESS_SETTINGS.address} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Stadt</Label>
                        <Input id="city" defaultValue={MOCK_BUSINESS_SETTINGS.city} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">Postleitzahl</Label>
                        <Input id="zipCode" defaultValue={MOCK_BUSINESS_SETTINGS.zipCode} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Land</Label>
                        <Input id="country" defaultValue={MOCK_BUSINESS_SETTINGS.country} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input id="phone" defaultValue={MOCK_BUSINESS_SETTINGS.phone} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-Mail</Label>
                        <Input id="email" type="email" defaultValue={MOCK_BUSINESS_SETTINGS.email} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" defaultValue={MOCK_BUSINESS_SETTINGS.website} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxId">Steuer-ID</Label>
                        <Input id="taxId" defaultValue={MOCK_BUSINESS_SETTINGS.taxId} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessHours">Geschäftszeiten</Label>
                        <Input id="businessHours" defaultValue={MOCK_BUSINESS_SETTINGS.businessHours} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Bankverbindung</CardTitle>
                    <CardDescription>Ihre Bankdaten für Rechnungen.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">IBAN</Label>
                        <Input id="bankAccount" defaultValue={MOCK_BUSINESS_SETTINGS.bankAccount} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank</Label>
                        <Input id="bankName" defaultValue={MOCK_BUSINESS_SETTINGS.bankName} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Firmenlogo</CardTitle>
                    <CardDescription>Upload Ihres Firmenlogos für Dokumente und Rechnungen.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        {MOCK_BUSINESS_SETTINGS.logoUrl ? (
                          <img src={MOCK_BUSINESS_SETTINGS.logoUrl} alt="Logo" className="max-w-full max-h-full" />
                        ) : (
                          <Building className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <Button variant="outline" size="sm">Logo hochladen</Button>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG oder SVG, max. 2MB</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Fußzeile für Dokumente</CardTitle>
                    <CardDescription>Dieser Text erscheint am Ende Ihrer Dokumente.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      defaultValue={MOCK_BUSINESS_SETTINGS.customFooterText}
                      className="min-h-[100px]"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* E-Mail-Einstellungen Tab */}
              <TabsContent value="emails" className="mt-4">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">SMTP-Einstellungen</CardTitle>
                    <CardDescription>Konfigurieren Sie Ihren E-Mail-Server für ausgehende E-Mails.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP-Host</Label>
                        <Input id="smtpHost" defaultValue={MOCK_EMAIL_SETTINGS.smtpHost} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP-Port</Label>
                        <Input id="smtpPort" defaultValue={MOCK_EMAIL_SETTINGS.smtpPort} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP-Benutzername</Label>
                        <Input id="smtpUser" defaultValue={MOCK_EMAIL_SETTINGS.smtpUser} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPassword">SMTP-Passwort</Label>
                        <Input id="smtpPassword" type="password" defaultValue={MOCK_EMAIL_SETTINGS.smtpPassword} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">E-Mail-Absender</CardTitle>
                    <CardDescription>Name und E-Mail-Adresse für ausgehende E-Mails.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="senderName">Absendername</Label>
                        <Input id="senderName" defaultValue={MOCK_EMAIL_SETTINGS.senderName} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="senderEmail">Absender-E-Mail</Label>
                        <Input id="senderEmail" type="email" defaultValue={MOCK_EMAIL_SETTINGS.senderEmail} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">E-Mail-Signatur</CardTitle>
                    <CardDescription>Diese Signatur wird an alle ausgehenden E-Mails angehängt.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      defaultValue={MOCK_EMAIL_SETTINGS.emailSignature}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-gray-500 mt-2">Sie können einfaches HTML verwenden, um die Signatur zu formatieren.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Erscheinungsbild Tab */}
              <TabsContent value="appearance" className="mt-4">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Theme</CardTitle>
                    <CardDescription>Passen Sie das Erscheinungsbild der Anwendung an.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="themeColor">Primärfarbe</Label>
                      <div className="flex items-center space-x-2">
                        <input type="color" id="themeColor" defaultValue="#1E40AF" className="w-10 h-10 rounded cursor-pointer" />
                        <Input defaultValue="#1E40AF" className="w-32" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Dunkelmodus</Label>
                      <div className="flex items-center space-x-2">
                        <Switch id="darkMode" />
                        <Label htmlFor="darkMode" className="text-sm font-normal">Dunkelmodus aktivieren</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Anpassung</CardTitle>
                    <CardDescription>Passen Sie die Anzeige von Elementen in der Anwendung an.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Sprache</Label>
                      <Select defaultValue="de">
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Sprache auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="en">Englisch</SelectItem>
                          <SelectItem value="fr">Französisch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Datumsformat</Label>
                      <Select defaultValue="dd.mm.yyyy">
                        <SelectTrigger id="dateFormat">
                          <SelectValue placeholder="Datumsformat auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd.mm.yyyy">DD.MM.YYYY</SelectItem>
                          <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Ausdrucke Tab */}
              <TabsContent value="prints" className="mt-4">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Rechnungseinstellungen</CardTitle>
                    <CardDescription>Passen Sie das Erscheinungsbild Ihrer Rechnungen an.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">Rechnungsprefix</Label>
                      <Input id="invoicePrefix" defaultValue="RECH-" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nextInvoiceNumber">Nächste Rechnungsnummer</Label>
                      <Input id="nextInvoiceNumber" type="number" defaultValue="1001" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Zahlungsbedingungen</Label>
                      <Select defaultValue="14">
                        <SelectTrigger id="paymentTerms">
                          <SelectValue placeholder="Zahlungsbedingungen auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Tage</SelectItem>
                          <SelectItem value="14">14 Tage</SelectItem>
                          <SelectItem value="30">30 Tage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Ausdrucksoptionen</CardTitle>
                    <CardDescription>Konfigurieren Sie die Anzeigeoptionen für Ausdrucke.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLogo" className="cursor-pointer">Logo auf Ausdrucken anzeigen</Label>
                      <Switch id="showLogo" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showFooter" className="cursor-pointer">Fußzeile auf Ausdrucken anzeigen</Label>
                      <Switch id="showFooter" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showSignature" className="cursor-pointer">Unterschriftsfeld anzeigen</Label>
                      <Switch id="showSignature" defaultChecked />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Etiketten</CardTitle>
                    <CardDescription>Einstellungen für Reparaturetiketten.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="labelSize">Etikettengröße</Label>
                      <Select defaultValue="medium">
                        <SelectTrigger id="labelSize">
                          <SelectValue placeholder="Etikettengröße auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Klein (62mm x 29mm)</SelectItem>
                          <SelectItem value="medium">Mittel (89mm x 36mm)</SelectItem>
                          <SelectItem value="large">Groß (102mm x 59mm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showQRCode" className="cursor-pointer">QR-Code auf Etiketten anzeigen</Label>
                      <Switch id="showQRCode" defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Abonnement Tab */}
              <TabsContent value="subscription" className="mt-4">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Aktuelles Abonnement</CardTitle>
                    <CardDescription>Details zu Ihrem aktuellen Abonnement.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="mr-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">Enterprise</h4>
                          <p className="text-gray-600">Nächste Abrechnung am 01.06.2025</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Abonnement-ID</span>
                        <span className="font-medium">ENT-20250501</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Beginn des Abonnements</span>
                        <span className="font-medium">01.05.2025</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monatliche Kosten</span>
                        <span className="font-medium">49,99 €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium text-green-600">Aktiv</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Funktionen & Limits</CardTitle>
                    <CardDescription>Übersicht der Funktionen und Limits Ihres Abonnements.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Unbegrenzte Reparaturaufträge</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Unbegrenzte Benutzer</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Kostenvoranschläge</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Etikettendruck</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Erweiterte Statistiken</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Benutzerdefinierte E-Mail-Vorlagen</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Zahlungsinformationen</CardTitle>
                    <CardDescription>Verwalten Sie Ihre Zahlungsmethoden.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 border rounded-lg p-4 mb-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-4">
                          <div className="w-10 h-6 bg-blue-900 rounded flex items-center justify-center text-white text-xs font-bold">
                            VISA
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Visa ****4242</p>
                          <p className="text-gray-500 text-sm">Läuft ab: 09/2028</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Ändern</Button>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline">Abonnement kündigen</Button>
                      <Button>Abonnement upgraden</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
