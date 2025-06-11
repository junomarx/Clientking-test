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
  repairId: number;
  tempId: string;
  customerName: string;
  repairDetails: string;
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

  // WebSocket-Listener für eingehende Unterschrifts-Anfragen über das Online-Status-System
  useEffect(() => {
    if (!isKioskMode) return;

    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        const message = event.detail;
        console.log('Kiosk: WebSocket-Nachricht empfangen', message);
        
        if (message.type === 'signature-request') {
          console.log('📝 Kiosk: Unterschrifts-Anfrage erhalten', {
            repairId: message.payload.repairId,
            customerName: message.payload.customerName,
            attempt: message.payload.attempt || 1
          });
          setSignatureRequest({
            repairId: message.payload.repairId,
            tempId: message.payload.tempId || `temp-${Date.now()}`,
            customerName: message.payload.customerName,
            repairDetails: message.payload.repairDetails,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten der Unterschrifts-Anfrage:', error);
      }
    };

    // Custom Event Listener für WebSocket-Nachrichten
    window.addEventListener('kioskWebSocketMessage', handleWebSocketMessage as EventListener);
    
    return () => {
      window.removeEventListener('kioskWebSocketMessage', handleWebSocketMessage as EventListener);
    };
  }, [isKioskMode]);

  // Automatische Kiosk-Registrierung bei jeder WebSocket-Verbindung
  useEffect(() => {
    if (isKioskMode && wsStatus === 'connected' && sendMessage && user?.id) {
      console.log('📱 Kiosk-Registrierung wird gestartet für Benutzer:', user.id);
      
      // Kurze Verzögerung um sicherzustellen, dass WebSocket vollständig verbunden ist
      const registerTimer = setTimeout(() => {
        sendMessage({
          type: 'register-kiosk',
          userId: user.id,
          timestamp: Date.now()
        });
        console.log('📱 Kiosk-Registrierungsnachricht gesendet');
      }, 100);
      
      return () => clearTimeout(registerTimer);
    }
  }, [isKioskMode, wsStatus, sendMessage, user?.id]);

  const activateKioskMode = () => {
    setIsKioskMode(true);
    localStorage.setItem('kioskMode', 'true');
    
    console.log('Kiosk-Modus aktiviert für Benutzer:', user?.id);
    console.log('WebSocket Status:', wsStatus);
    console.log('sendMessage verfügbar:', !!sendMessage);
    
    // Sofortige Registrierung wenn WebSocket verbunden ist
    if (wsStatus === 'connected' && sendMessage && user?.id) {
      console.log('Registriere Kiosk-Gerät sofort für Benutzer:', user.id);
      sendMessage({
        type: 'register-kiosk',
        userId: user.id
      });
    }
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