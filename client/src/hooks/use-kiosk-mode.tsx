import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface KioskModeContextType {
  isKioskMode: boolean;
  activateKioskMode: () => void;
  deactivateKioskMode: () => void;
  signatureRequest: SignatureRequest | null;
  clearSignatureRequest: () => void;
}

interface SignatureRequest {
  tempId: string;
  repairData: {
    orderCode: string;
    customerName: string;
    deviceType: string;
    brand: string;
    model: string;
    issue: string;
  };
  timestamp: number;
}

const KioskModeContext = createContext<KioskModeContextType | null>(null);

export function KioskModeProvider({ children }: { children: ReactNode }) {
  const [isKioskMode, setIsKioskMode] = useState(() => {
    return localStorage.getItem('kioskMode') === 'true';
  });
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const { user } = useAuth();
  const { wsStatus, sendMessage } = useOnlineStatus();

  // WebSocket-Listener für eingehende Unterschrifts-Anfragen
  useEffect(() => {
    if (!isKioskMode || wsStatus !== 'connected') return;

    const handleSignatureRequest = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'signature-request') {
          console.log('Kiosk: Unterschrifts-Anfrage erhalten', data.payload);
          setSignatureRequest({
            repairId: data.payload.repairId,
            customerName: data.payload.customerName,
            repairDetails: data.payload.repairDetails,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten der Unterschrifts-Anfrage:', error);
      }
    };

    // Event-Listener hinzufügen (falls WebSocket direkt verfügbar)
    if (typeof window !== 'undefined' && (window as any).kioskWebSocket) {
      (window as any).kioskWebSocket.addEventListener('message', handleSignatureRequest);
      return () => {
        (window as any).kioskWebSocket.removeEventListener('message', handleSignatureRequest);
      };
    }
  }, [isKioskMode, wsStatus]);

  const activateKioskMode = () => {
    setIsKioskMode(true);
    localStorage.setItem('kioskMode', 'true');
    
    // Kiosk-Gerät beim WebSocket-Server registrieren
    if (sendMessage) {
      sendMessage({
        type: 'register-kiosk',
        userId: user?.id
      });
    }
    
    console.log('Kiosk-Modus aktiviert');
  };

  const deactivateKioskMode = () => {
    setIsKioskMode(false);
    localStorage.removeItem('kioskMode');
    setSignatureRequest(null);
    
    // Kiosk-Registrierung beim WebSocket-Server entfernen
    if (sendMessage) {
      sendMessage({
        type: 'unregister-kiosk',
        userId: user?.id
      });
    }
    
    console.log('Kiosk-Modus deaktiviert');
  };

  const clearSignatureRequest = () => {
    setSignatureRequest(null);
  };

  return (
    <KioskModeContext.Provider
      value={{
        isKioskMode,
        activateKioskMode,
        deactivateKioskMode,
        signatureRequest,
        clearSignatureRequest
      }}
    >
      {children}
    </KioskModeContext.Provider>
  );
}

export function useKioskMode() {
  const context = useContext(KioskModeContext);
  if (!context) {
    throw new Error("useKioskMode must be used within a KioskModeProvider");
  }
  return context;
}