import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Building, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Shop {
  id: number;
  name: string;
  userCount: number;
  customerCount: number;
  repairCount: number;
  createdAt: string;
}

export default function ShopsPage() {
  const { toast } = useToast();

  // Shops abrufen
  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ["/api/superadmin/shops"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <h1 className="text-3xl font-bold">Shop-Verwaltung</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <h1 className="text-3xl font-bold">Shop-Verwaltung</h1>
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Fehler beim Laden der Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Die Shop-Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Shop-Verwaltung</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Neuen Shop erstellen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Alle Shops
          </CardTitle>
          <CardDescription>
            Verwaltung aller Handyshops auf der Plattform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shops && shops.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Kunden</TableHead>
                  <TableHead>Reparaturen</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell>{shop.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{shop.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {shop.userCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {shop.customerCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        {shop.repairCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(shop.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Löschen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <Building className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                Keine Shops gefunden. Erstellen Sie einen neuen Shop, um zu beginnen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nutzung pro Shop</CardTitle>
          <CardDescription>
            Vergleich der Datennutzung zwischen Shops
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center border rounded-md bg-muted/10">
            <p className="text-muted-foreground text-sm">
              Shop-Vergleichsdiagramme werden hier in zukünftigen Updates angezeigt
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
