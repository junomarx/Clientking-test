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
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  repairDetails: string;
  deviceInfo?: string;
  orderCode?: string;
  estimatedCost?: number;
  status?: string;
  repairTerms?: string;
  shopName?: string;
  timestamp: number;
}

const KioskModeContext = createContext<KioskModeContextType | null>(null);

export function KioskModeProvider({ children }: { children: ReactNode }) {
  const [isKioskMode, setIsKioskMode] = useState(() => {
    return localStorage.getItem('kioskMode') === 'true';
  });
  
  // Listener für automatische Kiosk-Aktivierung nach Login
  useEffect(() => {
    const handleAutoActivateKiosk = (event: CustomEvent) => {
      const { userId, role } = event.detail;
      console.log('🎯 Auto-Aktivierung Kiosk-Modus für:', { userId, role });
      
      if (role === 'kiosk') {
        setIsKioskMode(true);
        console.log('✅ Kiosk-Modus automatisch aktiviert');
      }
    };

    window.addEventListener('auto-activate-kiosk-mode', handleAutoActivateKiosk as EventListener);
    
    return () => {
      window.removeEventListener('auto-activate-kiosk-mode', handleAutoActivateKiosk as EventListener);
    };
  }, []);
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const { user } = useAuth();
  const { wsStatus, sendMessage } = useOnlineStatus();

  // WebSocket-Listener für eingehende Unterschrifts-Anfragen über das Online-Status-System
  useEffect(() => {
    if (!isKioskMode) return;

    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        const message = event.detail;
        console.log('🎯 Kiosk: WebSocket-Nachricht empfangen', message);
        console.log('🎯 Kiosk-Status:', {
          isKioskMode,
          hasMessage: !!message,
          messageType: message?.type,
          hasPayload: !!message?.payload,
          repairId: message?.payload?.repairId
        });
        
        if (message.type === 'signature-request') {
          console.log('✅ Kiosk: Gültige Unterschrifts-Anfrage wird verarbeitet', {
            repairId: message.payload?.repairId || message.repairId,
            customerName: message.payload?.customerName,
            tempId: message.tempId,
            attempt: message.payload?.attempt || 1
          });

          // Sofort ACK senden bei Empfang der Anfrage
          const kioskId = `kiosk-${user?.id || 'unknown'}`;
          sendMessage({
            type: 'signature-ack',
            tempId: message.tempId,
            status: 'opened',
            kioskId,
            timestamp: Date.now()
          });
          console.log(`✅ ACK gesendet für tempId: ${message.tempId}`);
          
          const newSignatureRequest = {
            repairId: message.payload?.repairId || message.repairId,
            tempId: message.tempId || `temp-${Date.now()}`,
            customerName: message.payload?.customerName,
            customerPhone: message.payload?.customerPhone,
            customerEmail: message.payload?.customerEmail,
            customerAddress: message.payload?.customerAddress,
            repairDetails: message.payload?.repairDetails,
            deviceInfo: message.payload?.deviceInfo,
            orderCode: message.payload?.orderCode,
            estimatedCost: message.payload?.estimatedCost,
            status: message.payload?.status,
            repairTerms: message.payload?.repairTerms,
            shopName: message.payload.shopName,
            timestamp: Date.now()
          };
          
          console.log('📝 Kiosk: Neue Unterschrifts-Anfrage erstellt:', newSignatureRequest);
          setSignatureRequest(newSignatureRequest);
        } else {
          console.warn('⚠️ Kiosk: Nachricht ist keine Unterschrifts-Anfrage:', message?.type);
        }
      } catch (error) {
        console.error('❌ Fehler beim Verarbeiten der Unterschrifts-Anfrage:', error);
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
      console.log('📱 Kiosk-Registrierung wird gestartet für Benutzer:', user.id, 'WebSocket Status:', wsStatus);
      
      // Kurze Verzögerung um sicherzustellen, dass WebSocket vollständig verbunden ist
      const registerTimer = setTimeout(() => {
        try {
          sendMessage({
            type: 'register-kiosk',
            userId: user.id,
            timestamp: Date.now()
          });
          console.log('📱 Kiosk-Registrierungsnachricht erfolgreich gesendet für Benutzer:', user.id);
        } catch (error) {
          console.error('❌ Fehler beim Senden der Kiosk-Registrierung:', error);
        }
      }, 200); // Erhöhte Verzögerung für stabilere Verbindung
      
      return () => clearTimeout(registerTimer);
    } else if (isKioskMode) {
      console.log('❌ Kiosk-Registrierung nicht möglich:', {
        isKioskMode,
        wsStatus,
        hasSendMessage: !!sendMessage,
        hasUserId: !!user?.id
      });
    }
  }, [isKioskMode, wsStatus, sendMessage, user?.id]);

  const activateKioskMode = () => {
    setIsKioskMode(true);
    localStorage.setItem('kioskMode', 'true');
    
    console.log('🔄 Kiosk-Modus aktiviert für Benutzer:', user?.id);
    console.log('🔄 WebSocket Status:', wsStatus);
    console.log('🔄 sendMessage verfügbar:', !!sendMessage);
    
    // Sofortige Registrierung wenn WebSocket verbunden ist
    if (wsStatus === 'connected' && sendMessage && user?.id) {
      console.log('🚀 Registriere Kiosk-Gerät sofort für Benutzer:', user.id);
      // Kleine Verzögerung auch hier für stabilere Registrierung
      setTimeout(() => {
        try {
          sendMessage({
            type: 'register-kiosk',
            userId: user.id,
            timestamp: Date.now()
          });
          console.log('✅ Sofortige Kiosk-Registrierung gesendet');
        } catch (error) {
          console.error('❌ Fehler bei sofortiger Kiosk-Registrierung:', error);
        }
      }, 100);
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