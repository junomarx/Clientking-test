import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeviceCodeDisplayProps {
  repairId: number;
  deviceCodeType: string | null;
}

interface DeviceCodeResponse {
  deviceCode: string;
  deviceCodeType: string;
}

export function DeviceCodeDisplay({ repairId, deviceCodeType }: DeviceCodeDisplayProps) {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decryptedCode, setDecryptedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const revealCode = async () => {
    if (revealed && decryptedCode) {
      setRevealed(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest("GET", `/api/repairs/${repairId}/device-code`);
      
      if (!response.ok) {
        throw new Error("Fehler beim Laden des Gerätecodes");
      }

      const data: DeviceCodeResponse = await response.json();
      setDecryptedCode(data.deviceCode);
      setRevealed(true);
    } catch (error) {
      console.error("Fehler beim Entschlüsseln des Gerätecodes:", error);
      toast({
        title: "Fehler",
        description: "Gerätecode konnte nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDeviceCode = () => {
    if (!revealed || !decryptedCode) {
      return deviceCodeType === 'text' ? '••••••••' : 'Muster';
    }

    if (deviceCodeType === 'pattern') {
      // Display pattern as grid visualization
      try {
        const pattern = decryptedCode.split('-').map(Number);
        return (
          <div className="inline-block">
            <div className="grid grid-cols-3 gap-1 bg-white border rounded p-2" style={{ width: '60px', height: '60px' }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border ${
                    pattern.includes(i) 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-gray-200 border-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              Muster: {decryptedCode}
            </div>
          </div>
        );
      } catch (error) {
        return `Muster: ${decryptedCode}`;
      }
    }

    return (
      <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded border">
        {decryptedCode}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {renderDeviceCode()}
        </span>
        <span className="text-xs text-muted-foreground">
          ({deviceCodeType === 'text' ? 'PIN/Code' : 'Android-Muster'})
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={revealCode}
        disabled={loading}
        className="h-6 w-6 p-0"
        title={revealed ? "Code verbergen" : "Code anzeigen"}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : revealed ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}