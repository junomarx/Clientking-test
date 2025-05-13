import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDirectAuth } from "@/hooks/use-direct-auth";
import { Loader2 } from "lucide-react";

export default function DirectLoginForm() {
  const [username, setUsername] = useState("bugi");
  const [password, setPassword] = useState("password");
  const { directLogin, isLoading, error } = useDirectAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await directLogin(username, password);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🚨 Notfall-Anmeldung</CardTitle>
        <CardDescription className="text-center">
          Dies ist ein Notfallzugang für den Benutzer "bugi"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Benutzername
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="bugi"
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Passwort
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
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
            className="w-full" 
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anmeldung läuft...
              </>
            ) : (
              "Notfall-Anmeldung"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-xs text-muted-foreground mt-2">
          Nur für den Testbenutzer "bugi" nutzbar!
        </p>
      </CardFooter>
    </Card>
  );
}