import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw } from 'lucide-react';

interface Point {
  x: number;
  y: number;
  index: number;
}

interface PatternDrawerProps {
  onPatternComplete: (pattern: string) => void;
  onClose: () => void;
}

export function PatternDrawer({ onPatternComplete, onClose }: PatternDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<number[]>([]);
  const [points, setPoints] = useState<Point[]>([]);

  const GRID_SIZE = 3;
  const CANVAS_SIZE = 300;
  const POINT_SIZE = 20;
  const LINE_WIDTH = 4;

  useEffect(() => {
    setupCanvas();
  }, []);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.scale(dpr, dpr);

    // Create grid points
    const newPoints: Point[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = (col + 1) * (CANVAS_SIZE / (GRID_SIZE + 1));
        const y = (row + 1) * (CANVAS_SIZE / (GRID_SIZE + 1));
        const index = row * GRID_SIZE + col + 1;
        newPoints.push({ x, y, index });
      }
    }
    setPoints(newPoints);
    drawCanvas(ctx, newPoints, []);
  };

  const drawCanvas = (ctx: CanvasRenderingContext2D, gridPoints: Point[], pattern: number[]) => {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid points
    gridPoints.forEach((point, idx) => {
      const isSelected = pattern.includes(point.index);
      ctx.beginPath();
      ctx.arc(point.x, point.y, POINT_SIZE, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#3b82f6' : '#e5e7eb';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#1e40af' : '#9ca3af';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw point number
      ctx.fillStyle = isSelected ? 'white' : '#374151';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(point.index.toString(), point.x, point.y);
    });

    // Draw connections
    if (pattern.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < pattern.length - 1; i++) {
        const currentPoint = gridPoints.find(p => p.index === pattern[i]);
        const nextPoint = gridPoints.find(p => p.index === pattern[i + 1]);
        
        if (currentPoint && nextPoint) {
          if (i === 0) {
            ctx.moveTo(currentPoint.x, currentPoint.y);
          }
          ctx.lineTo(nextPoint.x, nextPoint.y);
        }
      }
      ctx.stroke();
    }
  };

  const getPointAtPosition = (x: number, y: number): Point | null => {
    return points.find(point => {
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      return distance <= POINT_SIZE + 10; // Add some tolerance
    }) || null;
  };

  const getCanvasPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasPosition(e);
    const point = getPointAtPosition(x, y);
    
    if (point) {
      setIsDrawing(true);
      setCurrentPattern([point.index]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const { x, y } = getCanvasPosition(e);
    const point = getPointAtPosition(x, y);
    
    if (point && !currentPattern.includes(point.index)) {
      const newPattern = [...currentPattern, point.index];
      setCurrentPattern(newPattern);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        drawCanvas(ctx, points, newPattern);
      }
    }
  };

  const handleEnd = () => {
    if (currentPattern.length >= 2) {
      const patternString = currentPattern.join('-');
      onPatternComplete(patternString);
    }
    setIsDrawing(false);
  };

  const resetPattern = () => {
    setCurrentPattern([]);
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      drawCanvas(ctx, points, []);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Android-Muster zeichnen</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          Zeichnen Sie das Entsperrmuster, indem Sie die Punkte in der richtigen Reihenfolge verbinden
        </div>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-lg cursor-pointer touch-none"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        {currentPattern.length > 0 && (
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600">Muster: {currentPattern.join('-')}</div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={resetPattern} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Zurücksetzen
          </Button>
          <Button 
            onClick={() => currentPattern.length >= 2 && onPatternComplete(currentPattern.join('-'))}
            disabled={currentPattern.length < 2}
            className="flex-1"
          >
            Bestätigen
          </Button>
        </div>
      </div>
    </div>
  );
}