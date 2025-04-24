import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Star, LinkIcon, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Feedback {
  id: number;
  repairId: number;
  customerId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  feedbackToken: string;
}

interface RepairFeedbackProps {
  repairId: number;
}

export function RepairFeedback({ repairId }: RepairFeedbackProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Fetch existing feedback for this repair
  const { data: feedbackList, isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/repairs', repairId, 'feedback'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/repairs/${repairId}/feedback`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!response.ok) throw new Error("Feedback konnte nicht geladen werden");
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden des Feedbacks:", err);
        return [];
      }
    },
  });
  
  // Create feedback token mutation
  const createTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/repairs/${repairId}/feedback-token`);
      return response.json();
    },
    onSuccess: (data: { token: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs', repairId, 'feedback'] });
      toast({
        title: "Feedback-Link erstellt",
        description: "Der Link für Kundenfeedback wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Feedback-Link konnte nicht erstellt werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate feedback URL from token
  const getFeedbackUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/feedback?token=${token}`;
  };

  // Copy feedback link to clipboard
  const copyFeedbackLink = (token: string) => {
    const feedbackUrl = getFeedbackUrl(token);
    navigator.clipboard.writeText(feedbackUrl)
      .then(() => {
        setLinkCopied(true);
        toast({
          title: "Link kopiert",
          description: "Der Feedback-Link wurde in die Zwischenablage kopiert.",
        });
        
        // Reset copy icon after 3 seconds
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch(err => {
        toast({
          title: "Fehler",
          description: "Der Link konnte nicht kopiert werden.",
          variant: "destructive",
        });
      });
  };

  // Render the star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star}
            className={`h-5 w-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kundenfeedback</h3>
        <Button
          onClick={() => createTokenMutation.mutate()}
          disabled={createTokenMutation.isPending}
          size="sm"
        >
          {createTokenMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Erstelle...
            </>
          ) : (
            <>
              <LinkIcon className="mr-2 h-4 w-4" />
              Feedback-Link erstellen
            </>
          )}
        </Button>
      </div>

      {/* No feedback message */}
      {(!feedbackList || feedbackList.length === 0) && (
        <Alert>
          <AlertTitle>Kein Feedback vorhanden</AlertTitle>
          <AlertDescription>
            Es wurde noch kein Feedback für diese Reparatur abgegeben. Erstellen Sie einen Feedback-Link, um Kundenmeinungen zu sammeln.
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback list */}
      {feedbackList && feedbackList.length > 0 && (
        <div className="space-y-4">
          {/* Existing feedback */}
          {feedbackList.map(feedback => (
            <Card key={feedback.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base">Bewertung</CardTitle>
                  <Badge variant="outline">{new Date(feedback.createdAt).toLocaleDateString()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                {renderStars(feedback.rating)}
                {feedback.comment && (
                  <p className="mt-2 text-sm italic text-gray-600">"{feedback.comment}"</p>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2">
                    <Input 
                      value={getFeedbackUrl(feedback.feedbackToken)} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => copyFeedbackLink(feedback.feedbackToken)}
                    >
                      {linkCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}