import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

// Typen für die Props
interface CostEstimatesTabProps {
  onNewCostEstimate?: () => void;
}

export function CostEstimatesTab({ onNewCostEstimate }: CostEstimatesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleNewCostEstimate = () => {
    if (onNewCostEstimate) {
      onNewCostEstimate();
    } else {
      // Falls keine Callback-Funktion übergeben wurde, können wir ein Event auslösen
      window.dispatchEvent(new CustomEvent('trigger-new-cost-estimate'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Kopfzeile mit Titel und Beschreibung */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kostenvoranschläge</h1>
          <p className="text-sm text-muted-foreground">
            Erstellen und verwalten Sie Kostenvoranschläge für Ihre Kunden
          </p>
        </div>
        
        <Button 
          onClick={handleNewCostEstimate}
          className="w-full md:w-auto bg-gradient-to-r from-primary to-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kostenvoranschlag
        </Button>
      </div>
      
      {/* Suchleiste */}
      <div className="flex w-full max-w-md gap-2 mb-8">
        <Input
          type="search"
          placeholder="Suchen nach Kunde oder Gerät..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Inhalt - Zunächst leerer Platzhalter */}
      <Card>
        <CardHeader>
          <CardTitle>Kostenvoranschläge</CardTitle>
          <CardDescription>
            Hier erscheinen Ihre erstellten Kostenvoranschläge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-muted-foreground">Keine Kostenvoranschläge vorhanden</p>
            <p className="text-sm text-muted-foreground mb-4">
              Erstellen Sie einen neuen Kostenvoranschlag, um loszulegen
            </p>
            <Button 
              onClick={handleNewCostEstimate}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuer Kostenvoranschlag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CostEstimatesTab;