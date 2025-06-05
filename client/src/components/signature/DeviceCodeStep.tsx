import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Grid3X3, ArrowRight, SkipForward } from "lucide-react";

interface DeviceCodeStepProps {
  onComplete: (code: string | null, type: string | null) => void;
  shopName: string;
}

export default function DeviceCodeStep({ onComplete, shopName }: DeviceCodeStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<"text" | "pattern" | null>(null);
  const [textCode, setTextCode] = useState("");
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pattern drawing logic
  const drawPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const dotRadius = size * 0.03;
    const spacing = size * 0.3;
    const offsetX = (rect.width - spacing * 2) / 2;
    const offsetY = (rect.height - spacing * 2) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw dots
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = offsetX + col * spacing;
      const y = offsetY + row * spacing;

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
      
      if (pattern.includes(i)) {
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      } else {
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw lines between connected dots
    if (pattern.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      
      for (let i = 0; i < pattern.length; i++) {
        const dotIndex = pattern[i];
        const row = Math.floor(dotIndex / 3);
        const col = dotIndex % 3;
        const x = offsetX + col * spacing;
        const y = offsetY + row * spacing;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (selectedMethod === "pattern") {
      drawPattern();
    }
  }, [pattern, selectedMethod]);

  const handleCanvasInteraction = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if ('touches' in event) {
      event.preventDefault();
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const size = Math.min(rect.width, rect.height);
    const spacing = size * 0.3;
    const offsetX = (rect.width - spacing * 2) / 2;
    const offsetY = (rect.height - spacing * 2) / 2;
    const dotRadius = size * 0.06; // Größerer Bereich für Touch

    // Check which dot was touched
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const dotX = offsetX + col * spacing;
      const dotY = offsetY + row * spacing;

      const distance = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
      
      if (distance <= dotRadius && !pattern.includes(i)) {
        setPattern(prev => [...prev, i]);
        break;
      }
    }
  };

  const clearPattern = () => {
    setPattern([]);
  };

  const handleContinue = () => {
    if (selectedMethod === "text" && textCode.trim()) {
      onComplete(textCode.trim(), "text");
    } else if (selectedMethod === "pattern" && pattern.length >= 4) {
      // Store the actual pattern sequence for display purposes
      const patternString = pattern.join('-');
      onComplete(patternString, "pattern");
    }
  };

  const handleSkip = () => {
    onComplete(null, null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">
              Gerätecode eingeben
            </CardTitle>
            <p className="text-center text-gray-600 text-sm">
              {shopName}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-gray-700">
              Bitte wählen Sie eine Option oder überspringen Sie diesen Schritt:
            </div>

            {/* Method Selection */}
            {!selectedMethod && (
              <div className="space-y-3">
                <Button
                  onClick={() => setSelectedMethod("text")}
                  variant="outline"
                  className="w-full h-16 flex items-center gap-3"
                >
                  <Smartphone className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-medium">PIN/Passcode</div>
                    <div className="text-sm text-gray-500">Zahlen oder Text eingeben</div>
                  </div>
                </Button>

                <Button
                  onClick={() => setSelectedMethod("pattern")}
                  variant="outline"
                  className="w-full h-16 flex items-center gap-3"
                >
                  <Grid3X3 className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-medium">Android-Muster</div>
                    <div className="text-sm text-gray-500">Punkte verbinden</div>
                  </div>
                </Button>

                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="w-full h-12 flex items-center gap-2 text-gray-600"
                >
                  <SkipForward className="h-4 w-4" />
                  Überspringen
                </Button>
              </div>
            )}

            {/* Text Input */}
            {selectedMethod === "text" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-code">Gerätecode eingeben</Label>
                  <Input
                    id="device-code"
                    type="password"
                    placeholder="PIN oder Passcode"
                    value={textCode}
                    onChange={(e) => setTextCode(e.target.value)}
                    className="text-center text-lg"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedMethod(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Zurück
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={!textCode.trim()}
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Weiter
                  </Button>
                </div>
              </div>
            )}

            {/* Pattern Input */}
            {selectedMethod === "pattern" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Label>Android-Muster zeichnen</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Mindestens 4 Punkte verbinden
                  </p>
                </div>

                <div className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={280}
                    height={280}
                    className="border border-gray-300 rounded-lg bg-white cursor-pointer"
                    onMouseDown={() => setIsDrawing(true)}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseMove={(e) => isDrawing && handleCanvasInteraction(e)}
                    onMouseLeave={() => setIsDrawing(false)}
                    onTouchStart={(e) => {
                      setIsDrawing(true);
                      handleCanvasInteraction(e);
                    }}
                    onTouchEnd={() => setIsDrawing(false)}
                    onTouchMove={handleCanvasInteraction}
                    style={{ touchAction: 'none' }}
                  />
                </div>

                <div className="text-center text-sm text-gray-600">
                  {pattern.length === 0 && "Tippen Sie auf die Punkte um ein Muster zu zeichnen"}
                  {pattern.length > 0 && pattern.length < 4 && `${pattern.length} Punkte verbunden (mindestens 4 erforderlich)`}
                  {pattern.length >= 4 && `Muster mit ${pattern.length} Punkten erstellt`}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedMethod(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Zurück
                  </Button>
                  <Button
                    onClick={clearPattern}
                    variant="outline"
                    disabled={pattern.length === 0}
                  >
                    Löschen
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={pattern.length < 4}
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Weiter
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}