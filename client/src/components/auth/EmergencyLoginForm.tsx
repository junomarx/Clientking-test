import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmergencyAuth } from "@/hooks/use-emergency-auth";
import { Loader2, AlertTriangle } from "lucide-react";

export default function EmergencyLoginForm() {
  const [username, setUsername] = useState("bugi");
  const [password, setPassword] = useState("password");
  const { emergencyLogin, isLoading, error } = useEmergencyAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await emergencyLogin(username, password);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-red-500 border-2">
      <CardHeader className="bg-red-50">
        <div className="flex items-center justify-center mb-2">
          <AlertTriangle className="h-8 w-8 text-red-500 mr-2" />
          <CardTitle className="text-center text-red-700">🚨 NOTFALL-ANMELDUNG 🚨</CardTitle>
        </div>
        <CardDescription className="text-center text-red-600">
          Dies ist ein Notfallzugang für den Benutzer "bugi".<br />
          Dieser Zugang verwendet einen separaten Authentifizierungsserver.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="emergency-username" className="text-sm font-medium">
              Benutzername
            </label>
            <Input
              id="emergency-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="bugi"
              disabled={isLoading}
              className="border-red-200 focus:border-red-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="emergency-password" className="text-sm font-medium">
              Passwort
            </label>
            <Input
              id="emergency-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="border-red-200 focus:border-red-500"
              required
            />
          </div>
          
          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700" 
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Notfall-Anmeldung läuft...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Notfall-Anmeldung starten
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center bg-red-50">
        <p className="text-xs text-red-600 font-medium">
          Nur für die Notfall-Anmeldung des Benutzers "bugi" verwenden!
        </p>
      </CardFooter>
    </Card>
  );
}