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

  const getDeviceCodeTypeLabel = (type: string) => {
    switch (type) {
      case 'pin':
        return 'PIN/Code';
      case 'password':
        return 'Passwort';
      case 'pattern':
        return 'Android-Muster';
      default:
        return 'PIN/Code'; // Fallback für unbekannte Typen
    }
  };

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
      return deviceCodeType === 'pattern' ? 'Muster' : '••••••••';
    }

    if (deviceCodeType === 'pattern') {
      // Display pattern as grid visualization
      try {
        // Filter out empty strings and convert to numbers
        const pattern = decryptedCode.split('-').filter(p => p !== '').map(Number);
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 bg-white border rounded-lg p-4 mx-auto" style={{ width: '120px', height: '120px' }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    pattern.includes(i) 
                      ? 'bg-blue-500 border-blue-600 text-white' 
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700">Android-Muster</div>
              <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded mt-1">
                Reihenfolge: {pattern.map(p => p + 1).join(' → ')}
              </div>
            </div>
          </div>
        );
      } catch (error) {
        // Fallback: Zeige Zahlen mit +1 Umwandlung
        const displayPattern = decryptedCode.split('-').map(p => parseInt(p) + 1).join(' → ');
        return (
          <div className="text-sm">
            <div className="font-medium">Android-Muster</div>
            <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded mt-1">
              Reihenfolge: {displayPattern}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="text-sm">
        <div className="font-medium">PIN/Code</div>
        <div className="font-mono text-lg bg-blue-50 px-3 py-2 rounded border mt-1 tracking-wider">
          {decryptedCode}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!revealed && (
          <>
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {renderDeviceCode()}
            </span>
            <span className="text-xs text-muted-foreground">
              ({getDeviceCodeTypeLabel(deviceCodeType || 'pin')})
            </span>
          </>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={revealCode}
          disabled={loading}
          className="h-8 px-2 text-xs"
          title={revealed ? "Code verbergen" : "Code anzeigen"}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : revealed ? (
            <EyeOff className="h-3 w-3 mr-1" />
          ) : (
            <Eye className="h-3 w-3 mr-1" />
          )}
          {revealed ? "Verbergen" : "Anzeigen"}
        </Button>
      </div>
      
      {revealed && (
        <div className="mt-2">
          {renderDeviceCode()}
        </div>
      )}
    </div>
  );
}