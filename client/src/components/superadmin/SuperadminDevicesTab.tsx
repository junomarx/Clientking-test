// client/src/components/superadmin/SuperadminDevicesTab.tsx

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperadminDevicesTab() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Geräteverwaltung</h1>
      <Tabs defaultValue="types" className="w-full">
        <TabsList>
          <TabsTrigger value="types">Gerätetypen</TabsTrigger>
          <TabsTrigger value="brands">Hersteller</TabsTrigger>
          <TabsTrigger value="models">Modelle</TabsTrigger>
          <TabsTrigger value="errors">Fehlerkatalog</TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Gerätetypen</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die Gerätetypen angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Hersteller</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die Hersteller angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Modelle</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die Modelle angezeigt.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Fehlerkatalog</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hier werden die häufigsten Fehler und Diagnosen verwaltet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
