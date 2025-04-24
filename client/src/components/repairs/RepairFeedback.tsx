import { useQuery } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";
import { FeedbackLinkGenerator } from "./FeedbackLinkGenerator";

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
  // Lade Feedback für diese Reparatur
  const { data: feedback, isLoading, isError } = useQuery<Feedback[]>({
    queryKey: [`/api/repairs/${repairId}/feedback`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!repairId,
  });
  
  // Überprüfe, ob Feedback vorhanden ist
  const hasFeedback = feedback && feedback.length > 0 && feedback[0].rating > 0;
  
  // Sterne-Bewertung rendern
  const renderStars = (rating: number) => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-5 h-5 ${
            i <= rating
              ? "fill-yellow-400 text-yellow-500"
              : "text-gray-300"
          }`}
        />
      );
    }
    
    return stars;
  };
  
  // Datum formatieren
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd. MMMM yyyy, HH:mm", { locale: de });
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Kundenfeedback</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-50 text-red-800 rounded-md">
              <p>Fehler beim Laden des Feedbacks.</p>
            </div>
          ) : hasFeedback ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-1 mb-2">
                  {renderStars(feedback[0].rating)}
                  <span className="ml-2 text-sm font-medium">
                    {feedback[0].rating}/5
                  </span>
                </div>
                
                {feedback[0].comment && (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <p className="text-sm">{feedback[0].comment}</p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  Abgegeben am {formatDate(feedback[0].createdAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Für diese Reparatur wurde noch kein Feedback abgegeben.
            </p>
          )}
        </CardContent>
      </Card>
      
      {!hasFeedback && <FeedbackLinkGenerator repairId={repairId} />}
    </div>
  );
}