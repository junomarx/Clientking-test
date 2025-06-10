import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./use-auth";

interface OnlineUser {
  userId: number;
  username: string;
  isActive: boolean;
  lastSeen: string;
}

interface OnlineStatusContextType {
  onlineUsers: OnlineUser[];
  onlineCount: number;
  isUserOnline: (userId: number) => boolean;
  getUserLastSeen: (userId: number) => Date | null;
  isConnected: boolean;
  connectionError: string | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: any) => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | null>(null);

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const activityInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isReconnecting = useRef(false);

  // WebSocket-Verbindung aufbauen
  const connectWebSocket = () => {
    if (!user || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      // WebSocket-URL dynamisch erstellen
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/status`;
      
      console.log('Verbinde WebSocket für Online-Status:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket-Verbindung für Online-Status hergestellt');
        setIsConnected(true);
        setConnectionError(null);
        isReconnecting.current = false;

        // Authentifizierung senden
        if (wsRef.current && user) {
          wsRef.current.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            username: user.username
          }));
        }

        // Heartbeat starten
        startHeartbeat();
        startActivityTracking();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket-Verbindung geschlossen:', event.code, event.reason);
        setIsConnected(false);
        stopHeartbeat();
        stopActivityTracking();
        
        // Automatische Wiederverbindung nach 3 Sekunden
        if (!isReconnecting.current && user) {
          isReconnecting.current = true;
          reconnectTimeout.current = setTimeout(() => {
            console.log('Versuche WebSocket-Wiederverbindung...');
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket-Fehler:', error);
        setConnectionError('Verbindungsfehler beim Online-Status');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Fehler beim Erstellen der WebSocket-Verbindung:', error);
      setConnectionError('Konnte WebSocket-Verbindung nicht herstellen');
    }
  };

  // WebSocket-Nachrichten verarbeiten
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'auth_success':
        console.log('WebSocket-Authentifizierung erfolgreich');
        break;
        
      case 'status_update':
        if (message.onlineUsers) {
          setOnlineUsers(message.onlineUsers);
          setOnlineCount(message.onlineUsers.length);
        }
        break;
        
      case 'heartbeat_ack':
        // Heartbeat-Bestätigung erhalten
        break;
        
      case 'signature-request':
        // Weiterleitung an Kiosk-System über Custom Event
        console.log('Weiterleitung der Unterschrifts-Anfrage an Kiosk-System:', message);
        const kioskEvent = new CustomEvent('kioskWebSocketMessage', {
          detail: message
        });
        window.dispatchEvent(kioskEvent);
        break;
        
      default:
        console.log('Unbekannte WebSocket-Nachricht:', message);
    }
  };

  // Heartbeat-System
  const startHeartbeat = () => {
    heartbeatInterval.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && user) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          userId: user.id
        }));
      }
    }, 30000); // Alle 30 Sekunden
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  // Aktivitäts-Tracking
  const startActivityTracking = () => {
    let lastActivity = Date.now();

    const trackActivity = () => {
      lastActivity = Date.now();
      if (wsRef.current?.readyState === WebSocket.OPEN && user) {
        wsRef.current.send(JSON.stringify({
          type: 'activity',
          userId: user.id
        }));
      }
    };

    // Event-Listener für Benutzeraktivität
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keydown', trackActivity);
    document.addEventListener('scroll', trackActivity);
    document.addEventListener('touchstart', trackActivity);

    // Aktivitäts-Check alle 60 Sekunden
    activityInterval.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      // Wenn länger als 5 Minuten keine Aktivität, als inaktiv markieren
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        // Benutzer als inaktiv markieren (könnte erweitert werden)
      }
    }, 60000);

    // Cleanup-Funktion zurückgeben
    return () => {
      document.removeEventListener('mousedown', trackActivity);
      document.removeEventListener('keydown', trackActivity);
      document.removeEventListener('scroll', trackActivity);
      document.removeEventListener('touchstart', trackActivity);
    };
  };

  const stopActivityTracking = () => {
    if (activityInterval.current) {
      clearInterval(activityInterval.current);
      activityInterval.current = null;
    }
  };

  // Hilfsfunktionen
  const isUserOnline = (userId: number): boolean => {
    return onlineUsers.some(user => user.userId === userId);
  };

  const getUserLastSeen = (userId: number): Date | null => {
    const user = onlineUsers.find(u => u.userId === userId);
    return user ? new Date(user.lastSeen) : null;
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Effekte
  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      // Cleanup bei Unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopHeartbeat();
      stopActivityTracking();
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [user]);

  // Cleanup bei Benutzerabmeldung
  useEffect(() => {
    if (!user && wsRef.current) {
      console.log('Benutzer abgemeldet, schließe WebSocket-Verbindung');
      wsRef.current.close();
      setOnlineUsers([]);
      setOnlineCount(0);
      setIsConnected(false);
      setConnectionError(null);
    }
  }, [user]);

  return (
    <OnlineStatusContext.Provider
      value={{
        onlineUsers,
        onlineCount,
        isUserOnline,
        getUserLastSeen,
        isConnected,
        connectionError,
        wsStatus,
        sendMessage
      }}
    >
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus() {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error("useOnlineStatus must be used within an OnlineStatusProvider");
  }
  return context;
}