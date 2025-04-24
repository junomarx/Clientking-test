import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquare, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

interface FeedbackLinkGeneratorProps {
  repairId: number;
}

export function FeedbackLinkGenerator({ repairId }: FeedbackLinkGeneratorProps) {
  const { toast } = useToast();
  const [feedbackUrl, setFeedbackUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  
  // Mutation zum Erstellen eines Feedback-Tokens
  const { mutate: createFeedbackToken, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/repairs/${repairId}/feedback-token`);
      return await res.json();
    },
    onSuccess: (data) => {
      // Feedback-URL mit dem Token erstellen
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/feedback?token=${data.token}`;
      setFeedbackUrl(url);
      
      toast({
        title: "Feedback-Link erstellt",
        description: "Der Link wurde generiert und kann jetzt kopiert werden."
      });
    },
    onError: (error: Error) => {
      console.error("Fehler beim Erstellen des Feedback-Tokens:", error);
      toast({
        title: "Fehler",
        description: "Der Feedback-Link konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      });
    }
  });
  
  // Link in die Zwischenablage kopieren
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(feedbackUrl);
      setCopied(true);
      
      toast({
        title: "Link kopiert",
        description: "Der Feedback-Link wurde in die Zwischenablage kopiert."
      });
      
      // Status nach 2 Sekunden zurücksetzen
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Fehler beim Kopieren in die Zwischenablage:", error);
      toast({
        title: "Fehler",
        description: "Der Link konnte nicht kopiert werden. Bitte kopieren Sie ihn manuell.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-primary" />
          Kundenfeedback einholen
        </CardTitle>
        <CardDescription>
          Erstellen Sie einen personalisierten Link, um Feedback vom Kunden zu erhalten
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {feedbackUrl ? (
          <div className="space-y-2">
            <Label htmlFor="feedback-url">Feedback-Link:</Label>
            <div className="flex">
              <Input 
                id="feedback-url" 
                value={feedbackUrl} 
                readOnly 
                className="flex-1 font-mono text-xs"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="ml-2" 
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Teilen Sie diesen Link mit dem Kunden per E-Mail oder SMS, damit er seine Erfahrung bewerten kann.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Erstellen Sie einen eindeutigen Link für diesen Kunden, um Feedback zur Reparatur zu sammeln.
          </p>
        )}
      </CardContent>
      
      <CardFooter>
        {!feedbackUrl && (
          <Button 
            onClick={() => createFeedbackToken()} 
            disabled={isPending} 
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Wird erstellt...
              </>
            ) : (
              "Feedback-Link generieren"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}