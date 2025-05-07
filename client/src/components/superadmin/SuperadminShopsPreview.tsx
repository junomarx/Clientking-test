import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockShops = [
  { id: 1, name: "Handyshop Berlin", users: 4, active: true },
  { id: 2, name: "Reparatur Pro Wien", users: 2, active: false },
  { id: 3, name: "MobileFix Zürich", users: 7, active: true },
];

export default function SuperadminShopsPreview() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Shops (Vorschau)</h1>
      <p className="text-muted-foreground">Dies ist eine nicht-funktionale Vorschau zur späteren Shop-Verwaltung.</p>

      <Card>
        <CardHeader>
          <CardTitle>Alle Shops (Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockShops.map((shop) => (
                <TableRow key={shop.id}>
                  <TableCell>{shop.id}</TableCell>
                  <TableCell>{shop.name}</TableCell>
                  <TableCell>{shop.users}</TableCell>
                  <TableCell>
                    {shop.active ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-700">Inaktiv</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" disabled>Bearbeiten</Button>
                    <Button size="sm" variant="secondary" disabled>Deaktivieren</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}