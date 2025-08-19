import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

interface ConnectedUser {
  userId: number;
  username: string;
  socket: WebSocket;
  lastHeartbeat: Date;
  isActive: boolean;
  isKiosk?: boolean;
}

class OnlineStatusManager {
  private wss: WebSocketServer;
  private connectedUsers = new Map<number, ConnectedUser>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statusBroadcastInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/status' });
    this.setupWebSocketHandlers();
    this.startHeartbeatCheck();
    this.startStatusBroadcast();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('WebSocket connection established');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    console.log('WebSocket message received:', message.type, message);
    
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.userId, message.username);
        break;
      
      case 'heartbeat':
        await this.handleHeartbeat(message.userId);
        break;
      
      case 'activity':
        await this.handleActivity(message.userId);
        break;
        
      case 'register-kiosk':
        console.log('Processing kiosk registration for user:', message.userId);
        await this.registerKiosk(ws, message.userId);
        break;
      
      case 'unregister-kiosk':
        console.log('Processing kiosk unregistration for user:', message.userId);
        await this.unregisterKiosk(message.userId);
        break;
      
      case 'signature-request':
        await this.handleSignatureRequest(ws, message);
        break;
      
      case 'signature-request-retry':
        await this.handleSignatureRequestRetry(ws, message);
        break;
      
      case 'signature-ack':
        await this.handleSignatureAck(ws, message);
        break;
      
      case 'signature-complete':
        await this.handleSignatureComplete(ws, message);
        break;
      
      default:
        console.log('Unknown message type:', message.type, message);
    }
  }

  private async handleAuth(ws: WebSocket, userId: number, username: string) {
    if (!userId || !username) {
      ws.close(1000, 'Invalid auth data');
      return;
    }

    // Entferne alte Verbindung falls vorhanden
    if (this.connectedUsers.has(userId)) {
      const oldConnection = this.connectedUsers.get(userId);
      if (oldConnection && oldConnection.socket !== ws) {
        oldConnection.socket.close();
      }
    }

    // Benutzerrolle aus Datenbank abrufen um Kiosk-Status zu ermitteln
    let isKioskUser = false;
    try {
      const user = await storage.getUser(userId);
      isKioskUser = user?.role === 'kiosk';
      console.log(`🔍 User ${username} (ID: ${userId}) - Role: ${user?.role} - Is Kiosk: ${isKioskUser}`);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }

    // Neue Verbindung hinzufügen
    this.connectedUsers.set(userId, {
      userId,
      username,
      socket: ws,
      lastHeartbeat: new Date(),
      isActive: true,
      isKiosk: isKioskUser
    });

    // LastLoginAt in Datenbank aktualisieren
    try {
      await storage.updateUserLoginTimestamp(userId);
    } catch (error) {
      console.error('Error updating login timestamp:', error);
    }

    // Bestätigung senden
    ws.send(JSON.stringify({
      type: 'auth_success',
      message: 'Authentication successful'
    }));

    // Status-Update an alle Clients
    this.broadcastStatusUpdate();

    console.log(`User ${username} (${userId}) connected via WebSocket`);
  }

  private async handleHeartbeat(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastHeartbeat = new Date();
      user.isActive = true;
      
      // Heartbeat-Bestätigung senden
      user.socket.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async handleActivity(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastHeartbeat = new Date();
      user.isActive = true;
    }
  }

  private handleDisconnection(ws: WebSocket) {
    // Finde und entferne den Benutzer
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.socket === ws) {
        console.log(`User ${user.username} (${userId}) disconnected`);
        this.connectedUsers.delete(userId);
        
        // LastLogoutAt in Datenbank aktualisieren
        storage.updateUserLogoutTimestamp(userId).catch(error => {
          console.error('Error updating logout timestamp:', error);
        });
        
        break;
      }
    }

    // Status-Update an alle Clients
    this.broadcastStatusUpdate();
  }

  private startHeartbeatCheck() {
    // Überprüfe alle 30 Sekunden auf inaktive Verbindungen
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 2 * 60 * 1000; // 2 Minuten Timeout

      for (const [userId, user] of this.connectedUsers.entries()) {
        const timeSinceLastHeartbeat = now.getTime() - user.lastHeartbeat.getTime();
        
        if (timeSinceLastHeartbeat > timeout) {
          console.log(`User ${user.username} (${userId}) timed out`);
          user.socket.close();
          this.connectedUsers.delete(userId);
          
          // LastLogoutAt in Datenbank aktualisieren
          storage.updateUserLogoutTimestamp(userId).catch(error => {
            console.error('Error updating logout timestamp:', error);
          });
        }
      }
    }, 30000);
  }

  private startStatusBroadcast() {
    // Sende alle 60 Sekunden Status-Updates an alle Clients
    this.statusBroadcastInterval = setInterval(() => {
      this.broadcastStatusUpdate();
    }, 60000);
  }

  private broadcastStatusUpdate() {
    const onlineUsers = Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      isActive: user.isActive,
      lastSeen: user.lastHeartbeat.toISOString()
    }));

    const statusMessage = JSON.stringify({
      type: 'status_update',
      onlineUsers,
      timestamp: new Date().toISOString()
    });

    // An alle verbundenen Clients senden
    for (const user of this.connectedUsers.values()) {
      if (user.socket && user.socket.readyState === WebSocket.OPEN) {
        try {
          user.socket.send(statusMessage);
        } catch (error) {
          console.error('Error sending status update:', error);
        }
      }
    }
  }

  // API-Methoden für externe Nutzung
  getOnlineUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  getUserLastSeen(userId: number): Date | null {
    const user = this.connectedUsers.get(userId);
    return user ? user.lastHeartbeat : null;
  }

  // NEUE METHODE: Prüft ob echte Kiosk-Geräte verfügbar sind
  hasActiveKiosks(): boolean {
    const activeKiosks = Array.from(this.connectedUsers.values()).filter(user => 
      user.isKiosk && user.socket.readyState === WebSocket.OPEN
    );
    return activeKiosks.length > 0;
  }

  // NEUE METHODE: Anzahl der aktiven Kiosk-Geräte
  getActiveKioskCount(): number {
    return Array.from(this.connectedUsers.values()).filter(user => 
      user.isKiosk && user.socket.readyState === WebSocket.OPEN
    ).length;
  }

  // Kiosk-Registrierung
  private async registerKiosk(ws: WebSocket, userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user && user.socket === ws) {
      user.isKiosk = true;
      console.log(`📱 Kiosk registriert: ${user.username} (${userId}) - WebSocket bereit`);
      console.log(`📱 Aktuelle Kiosk-Geräte: ${Array.from(this.connectedUsers.values()).filter(u => u.isKiosk).map(u => u.username).join(', ')}`);
      
      // Bestätigung senden
      ws.send(JSON.stringify({
        type: 'kiosk_registered',
        message: 'Kiosk registration successful',
        timestamp: Date.now()
      }));
    } else {
      console.error(`❌ Kiosk-Registrierung fehlgeschlagen für userId ${userId}: Benutzer nicht gefunden oder WebSocket stimmt nicht überein`);
    }
  }

  // Kiosk-Deregistrierung
  private async unregisterKiosk(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.isKiosk = false;
      console.log(`📱 Kiosk deregistriert: ${user.username} (${userId})`);
    }
  }

  // Broadcast-Methode für externe Nachrichten
  broadcast(message: any): void {
    const messageString = JSON.stringify(message);
    
    for (const user of this.connectedUsers.values()) {
      if (user.socket.readyState === WebSocket.OPEN) {
        try {
          user.socket.send(messageString);
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    }
  }

  // Gezielte Broadcast-Nachricht nur an Kiosk-Geräte
  broadcastToKiosks(message: any): void {
    const messageString = JSON.stringify(message);
    const kioskUsers = Array.from(this.connectedUsers.values()).filter(u => u.isKiosk);
    
    console.log(`📡 Sende Nachricht an ${kioskUsers.length} Kiosk-Geräte:`, kioskUsers.map(u => `${u.username}(${u.userId})`));
    
    if (kioskUsers.length === 0) {
      console.warn(`⚠️ Keine Kiosk-Geräte registriert! Aktuelle Verbindungen: ${Array.from(this.connectedUsers.values()).map(u => `${u.username}(kiosk:${u.isKiosk})`).join(', ')}`);
    }
    
    for (const user of kioskUsers) {
      if (user.socket.readyState === WebSocket.OPEN) {
        try {
          user.socket.send(messageString);
          console.log(`✅ Kiosk-Nachricht gesendet an ${user.username} (${user.userId})`);
        } catch (error) {
          console.error(`❌ Fehler beim Senden an Kiosk ${user.username}:`, error);
        }
      } else {
        console.warn(`⚠️ Kiosk-WebSocket nicht bereit: ${user.username} (Status: ${user.socket.readyState})`);
      }
    }
  }

  // Neue ACK-Mechanismus Handler
  private async handleSignatureRequest(ws: WebSocket, message: any) {
    const { tempId, repairId, timestamp } = message;
    
    console.log(`🎯 PC: Signaturanfrage erhalten - tempId: ${tempId}, repairId: ${repairId}`);
    
    // Log für DSGVO & Debugging
    console.log(`[SIGNATURE-LOG] Request sent - tempId: ${tempId}, repairId: ${repairId}, timestamp: ${timestamp}`);
    
    // Weiterleitung an alle Kiosks
    this.broadcastToKiosks({
      type: 'signature-request',
      tempId,
      repairId,
      timestamp,
      payload: message.payload
    });
  }

  private async handleSignatureRequestRetry(ws: WebSocket, message: any) {
    const { tempId, retryCount } = message;
    
    console.log(`🔄 PC: Retry ${retryCount} für tempId: ${tempId}`);
    
    // Log für DSGVO & Debugging
    console.log(`[SIGNATURE-LOG] Retry sent - tempId: ${tempId}, retryCount: ${retryCount}, timestamp: ${Date.now()}`);
    
    // Erneute Weiterleitung an alle Kiosks
    this.broadcastToKiosks({
      type: 'signature-request',
      tempId,
      retryCount,
      timestamp: Date.now(),
      payload: message.payload
    });
  }

  private async handleSignatureAck(ws: WebSocket, message: any) {
    const { tempId, status, kioskId, timestamp } = message;
    
    console.log(`✅ Kiosk: ACK empfangen - tempId: ${tempId}, status: ${status}, kioskId: ${kioskId}`);
    
    // Log für DSGVO & Debugging
    console.log(`[SIGNATURE-LOG] ACK received - tempId: ${tempId}, status: ${status}, kioskId: ${kioskId}, timestamp: ${timestamp}`);
    
    // ACK an alle PCs weiterleiten (nicht nur den Sender)
    this.broadcastToPCs({
      type: 'signature-ack',
      tempId,
      status,
      kioskId,
      timestamp
    });
  }

  private async handleSignatureComplete(ws: WebSocket, message: any) {
    const { tempId, repairId, signatureData, timestamp } = message;
    
    console.log(`🎉 Kiosk: Unterschrift vollständig - tempId: ${tempId}, repairId: ${repairId}`);
    
    // Log für DSGVO & Debugging
    console.log(`[SIGNATURE-LOG] Signature complete - tempId: ${tempId}, repairId: ${repairId}, timestamp: ${timestamp}`);
    
    // Unterschrift an alle PCs weiterleiten
    this.broadcastToPCs({
      type: 'signature-complete',
      tempId,
      repairId,
      signatureData,
      timestamp
    });
  }

  // Hilfsmethoden für zielgerichtete Übertragung
  private broadcastToPCs(message: any) {
    let pcCount = 0;
    this.connectedUsers.forEach((user) => {
      if (!user.isKiosk && user.socket.readyState === WebSocket.OPEN) {
        user.socket.send(JSON.stringify(message));
        pcCount++;
      }
    });
    console.log(`💻 Nachricht an ${pcCount} PC(s) gesendet:`, message.type);
  }

  // Force-Register für Debug-Zwecke (simuliert WebSocket-Registrierung)
  forceRegisterKiosk(userId: number): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.isKiosk = true;
      console.log(`🛠️ DEBUG: Kiosk ${userId} (${user.username}) force-registered`);
    } else {
      // Erstelle temporären Benutzer für Force-Registration
      const tempUser: ConnectedUser = {
        userId,
        username: `debug-kiosk-${userId}`,
        socket: null as any, // Wird nie verwendet bei Debug
        lastHeartbeat: new Date(),
        isActive: true,
        isKiosk: true
      };
      this.connectedUsers.set(userId, tempUser);
      console.log(`🛠️ DEBUG: Kiosk ${userId} force-registered als Temp-User`);
    }
  }

  // Debug-Methode um zu sehen welche Benutzer registriert sind
  getRegisteredUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  // Prüfen ob ein Benutzer online ist
  isUserOnline(userId: number): boolean {
    const user = this.connectedUsers.get(userId);
    return user ? user.isActive : false;
  }

  // Cleanup-Methode
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.statusBroadcastInterval) {
      clearInterval(this.statusBroadcastInterval);
    }
    
    // Alle Verbindungen schließen
    for (const user of this.connectedUsers.values()) {
      user.socket.close();
    }
    
    this.wss.close();
  }
}

let onlineStatusManager: OnlineStatusManager | null = null;

export function initializeWebSocketServer(server: Server): OnlineStatusManager {
  if (onlineStatusManager) {
    onlineStatusManager.shutdown();
  }
  
  onlineStatusManager = new OnlineStatusManager(server);
  return onlineStatusManager;
}

export function getOnlineStatusManager(): OnlineStatusManager | null {
  return onlineStatusManager;
}