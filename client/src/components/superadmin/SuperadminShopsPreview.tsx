import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronRight, 
  PlusCircle, 
  Search, 
  Phone, 
  Users, 
  FileText, 
  Settings, 
  DollarSign,
  BarChart3 
} from "lucide-react";

// Mock-Daten für die Demo der Benutzeroberfläche
const mockRepairs = [
  { id: 1, orderCode: "AS258001", customer: "Max Mustermann", device: "iPhone 13", status: "In Bearbeitung", date: "07.05.2025" },
  { id: 2, orderCode: "AS258002", customer: "Laura Schmidt", device: "Samsung Galaxy S21", status: "Abgeschlossen", date: "06.05.2025" },
  { id: 3, orderCode: "AS258003", customer: "Thomas Meier", device: "Huawei P40", status: "Wartet auf Teile", date: "05.05.2025" },
  { id: 4, orderCode: "AS258004", customer: "Anna Weber", device: "iPad Pro", status: "Wartet auf Kunde", date: "04.05.2025" },
];

const mockCustomers = [
  { id: 1, name: "Max Mustermann", phone: "+49 123 4567890", repairs: 3 },
  { id: 2, name: "Laura Schmidt", phone: "+49 987 6543210", repairs: 1 },
  { id: 3, name: "Thomas Meier", phone: "+49 456 7890123", repairs: 2 },
];

const mockStats = [
  { title: "Reparaturen heute", value: "4", color: "bg-blue-500" },
  { title: "Offene Reparaturen", value: "12", color: "bg-yellow-500" },
  { title: "Kunden insgesamt", value: "87", color: "bg-green-500" },
  { title: "Umsatz (Mai)", value: "4.235 €", color: "bg-purple-500" },
];

export default function SuperadminDesignPreview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Designvorschau - Benutzer-Interface</h1>
        <p className="text-muted-foreground">
          Dies ist eine nicht-funktionale Vorschau des Benutzerinterfaces im Superadmin-Stil. 
          Hier sehen Sie, wie das Interface eines regulären Shop-Benutzers aussehen könnte.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="repairs">Reparaturen</TabsTrigger>
          <TabsTrigger value="customers">Kunden</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Statistik-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className={`${stat.color} text-white rounded-t-lg px-4 py-2`}>
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Aktuelle Reparaturen */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Aktuelle Reparaturen</CardTitle>
              <CardDescription>Die neuesten Reparaturaufträge</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auftrag</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Gerät</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRepairs.map((repair) => (
                    <TableRow key={repair.id}>
                      <TableCell className="font-medium">{repair.orderCode}</TableCell>
                      <TableCell>{repair.customer}</TableCell>
                      <TableCell>{repair.device}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={repair.status === "Abgeschlossen" 
                            ? "bg-green-100 text-green-800" 
                            : repair.status === "In Bearbeitung"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"}>
                          {repair.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{repair.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" disabled><ChevronRight className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" disabled>Alle anzeigen</Button>
              <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Neue Reparatur</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="repairs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Reparaturverwaltung</CardTitle>
                <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Neue Reparatur</Button>
              </div>
              <CardDescription>Verwalten Sie alle Reparaturaufträge</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    className="pl-8 pr-4 py-2 w-full rounded-md border border-input bg-background" 
                    placeholder="Suchen..." 
                    disabled
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>Filter</Button>
                  <Button variant="outline" size="sm" disabled>Sortieren</Button>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auftrag</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Gerät</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRepairs.map((repair) => (
                    <TableRow key={repair.id}>
                      <TableCell className="font-medium">{repair.id}</TableCell>
                      <TableCell>{repair.customer}</TableCell>
                      <TableCell>{repair.device}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={repair.status === "Abgeschlossen" 
                            ? "bg-green-100 text-green-800" 
                            : repair.status === "In Bearbeitung"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"}>
                          {repair.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{repair.date}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled>Bearbeiten</Button>
                          <Button variant="outline" size="sm" disabled>Drucken</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Kundenverwaltung</CardTitle>
                <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Neuer Kunde</Button>
              </div>
              <CardDescription>Verwalten Sie Ihre Kundendaten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    className="pl-8 pr-4 py-2 w-full rounded-md border border-input bg-background" 
                    placeholder="Kunden suchen..." 
                    disabled
                  />
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Reparaturen</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.repairs}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled>Bearbeiten</Button>
                          <Button variant="outline" size="sm" disabled>Reparaturen</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation Preview (als Referenz) */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Navigation (Vorschau)</CardTitle>
          <CardDescription>So könnte die Navigation im User-Interface aussehen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2 bg-muted/20 p-4 rounded-lg border">
            <Button className="justify-start" disabled><BarChart3 className="mr-2 h-4 w-4" /> Dashboard</Button>
            <Button className="justify-start" variant="ghost" disabled><Phone className="mr-2 h-4 w-4" /> Reparaturen</Button>
            <Button className="justify-start" variant="ghost" disabled><Users className="mr-2 h-4 w-4" /> Kunden</Button>
            <Button className="justify-start" variant="ghost" disabled><FileText className="mr-2 h-4 w-4" /> Kostenvoranschläge</Button>
            <Button className="justify-start" variant="ghost" disabled><DollarSign className="mr-2 h-4 w-4" /> Zahlungen</Button>
            <Button className="justify-start" variant="ghost" disabled><Settings className="mr-2 h-4 w-4" /> Einstellungen</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}