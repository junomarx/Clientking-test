import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardDescription, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackData {
  token: string;
  rating: number;
  comment: string | null;
  submitted: boolean;
  repair: {
    id: number;
    brand: string;
    model: string;
    deviceType: string;
    status: string;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  business: {
    name: string;
    logoImage?: string;
  };
}

export default function FeedbackPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  
  // Extrahiere den Token aus der URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Kein Feedback-Token gefunden. Bitte verwenden Sie den Link aus Ihrer Benachrichtigung.");
      setLoading(false);
    }
  }, []);
  
  // Lade die Feedback-Informationen
  useEffect(() => {
    if (!token) return;
    
    const fetchFeedbackData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/feedback/${token}`);
        
        if (!response.ok) {
          throw new Error("Feedback-Token ungültig oder abgelaufen");
        }
        
        const data = await response.json();
        setFeedbackData(data);
        
        // Wenn bereits eine Bewertung abgegeben wurde
        if (data.submitted) {
          setSelectedRating(data.rating);
          setComment(data.comment || "");
          setSubmitted(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Fehler beim Laden der Feedback-Informationen:", error);
        setError("Feedback-Token ungültig oder abgelaufen. Bitte verwenden Sie den Link aus Ihrer Benachrichtigung.");
        setLoading(false);
      }
    };
    
    fetchFeedbackData();
  }, [token]);
  
  // Feedback absenden
  const submitFeedback = async () => {
    if (!token || selectedRating < 1) return;
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined
        }),
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Übermitteln des Feedbacks");
      }
      
      setSubmitted(true);
      toast({
        title: "Vielen Dank!",
        description: "Ihr Feedback wurde erfolgreich übermittelt.",
      });
    } catch (error) {
      console.error("Fehler beim Absenden des Feedbacks:", error);
      toast({
        title: "Fehler",
        description: "Beim Absenden Ihres Feedbacks ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Bewertungssterne rendern
  const renderStars = () => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => !submitted && setSelectedRating(i)}
          disabled={submitted}
          className={`transition-all duration-200 ${
            submitted ? "cursor-default" : "hover:scale-110 cursor-pointer"
          }`}
          aria-label={`${i} Sterne`}
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              i <= selectedRating
                ? "fill-yellow-400 text-yellow-500"
                : "text-gray-300"
            }`}
          />
        </button>
      );
    }
    
    return stars;
  };
  
  // Gerätetyp übersetzen
  const translateDeviceType = (type: string) => {
    switch (type) {
      case "smartphone": return "Smartphone";
      case "tablet": return "Tablet";
      case "laptop": return "Laptop";
      default: return type;
    }
  };
  
  // Status übersetzen
  const translateStatus = (status: string) => {
    switch (status) {
      case "eingegangen": return "Eingegangen";
      case "in_reparatur": return "In Reparatur";
      case "fertig": return "Fertig";
      case "abgeholt": return "Abgeholt";
      case "ausser_haus": return "Außer Haus";
      default: return status;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-center text-muted-foreground">Lade Feedback-Informationen...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Fehler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!feedbackData) return null;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="border-b bg-card">
          <div className="flex items-center justify-between">
            {feedbackData.business.logoImage && (
              <div className="flex-shrink-0">
                <img 
                  src={feedbackData.business.logoImage} 
                  alt="Logo" 
                  className="max-h-12 max-w-[120px] object-contain"
                />
              </div>
            )}
            <div className={feedbackData.business.logoImage ? "ml-4" : ""}>
              <CardTitle className="text-xl">{feedbackData.business.name}</CardTitle>
              <CardDescription>Kundenfeedback</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-50">
              <div className="rounded-full bg-green-100 p-3 mb-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium text-green-800">Vielen Dank für Ihr Feedback!</h3>
              <p className="text-center text-green-700 mt-2">
                Ihre Bewertung hilft uns, unseren Service zu verbessern.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">
                  Hallo {feedbackData.customer.firstName} {feedbackData.customer.lastName}!
                </h3>
                <p className="text-muted-foreground mt-1">
                  Wie zufrieden sind Sie mit der Reparatur Ihres Geräts?
                </p>
              </div>
              
              <div className="bg-slate-100 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Gerät:</span>
                    <p>{translateDeviceType(feedbackData.repair.deviceType)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Hersteller/Modell:</span>
                    <p>{feedbackData.repair.brand} {feedbackData.repair.model}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Status:</span>
                    <p>{translateStatus(feedbackData.repair.status)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <h3 className="text-center mb-2 font-medium">
                {submitted ? "Ihre Bewertung:" : "Bitte bewerten Sie uns:"}
              </h3>
              <div className="flex gap-1">{renderStars()}</div>
            </div>
            
            {!submitted ? (
              <div className="w-full mb-4">
                <label htmlFor="comment" className="block text-sm font-medium mb-1">
                  Kommentar (optional):
                </label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Teilen Sie uns Ihre Erfahrungen mit..."
                  className="min-h-[100px]"
                />
              </div>
            ) : comment ? (
              <div className="w-full mb-4">
                <h3 className="text-sm font-medium mb-1">Ihr Kommentar:</h3>
                <div className="p-3 border rounded-md bg-gray-50">
                  <p className="text-sm">{comment}</p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
        
        <CardFooter className="border-t bg-card flex justify-center py-4">
          {!submitted ? (
            <Button 
              onClick={submitFeedback}
              disabled={selectedRating < 1 || submitting}
              className="w-full max-w-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Wird gesendet...
                </>
              ) : (
                "Feedback senden"
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Feedback wurde am {new Date().toLocaleDateString()} abgegeben.
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}