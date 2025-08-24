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
      
      case 'request_status':
        this.sendCurrentStatus(ws);
        break;
      
      default:
        console.log('Unknown message type:', message.type, message);
    }
  }

  private async handleAuth(ws: WebSocket, userId: number, username: string) {
    if (!userId) {
      ws.close(1000, 'Invalid auth data - missing userId');
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
    let actualUsername = username;
    try {
      const user = await storage.getUser(userId);
      isKioskUser = user?.role === 'kiosk';
      // Für Kiosk-Benutzer verwenden wir den Namen aus der Datenbank
      if (isKioskUser && user) {
        actualUsername = `${user.firstName} ${user.lastName}`;
      }
      console.log(`🔍 User ${actualUsername} (ID: ${userId}) - Role: ${user?.role} - Is Kiosk: ${isKioskUser}`);
      
      // Automatische Kiosk-Registrierung für Benutzer mit role === 'kiosk'
      if (isKioskUser) {
        console.log(`🤖 Automatische Kiosk-Registrierung für ${actualUsername} (${userId})`);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }

    // Neue Verbindung hinzufügen
    this.connectedUsers.set(userId, {
      userId,
      username: actualUsername,
      socket: ws,
      lastHeartbeat: new Date(),
      isActive: true,
      isKiosk: isKioskUser
    });
    
    // Bei Kiosk-Benutzern automatische Bestätigung senden
    if (isKioskUser) {
      console.log(`📱 Automatische Kiosk-Aktivierung: ${actualUsername} (${userId})`);
      console.log(`📱 Aktuelle Kiosk-Geräte: ${Array.from(this.connectedUsers.values()).filter(u => u.isKiosk).map(u => u.username).join(', ')}`);
      
      // Bestätigung an Kiosk senden
      ws.send(JSON.stringify({
        type: 'kiosk_registered',
        message: 'Kiosk automatically registered',
        timestamp: Date.now()
      }));
    }

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

    console.log(`User ${actualUsername} (${userId}) connected via WebSocket`);
  }

  private async handleHeartbeat(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user && user.socket && user.socket.readyState === WebSocket.OPEN) {
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
          if (user.socket && user.socket.readyState === WebSocket.OPEN) {
            user.socket.close();
          }
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

  private sendCurrentStatus(ws: WebSocket) {
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

    try {
      ws.send(statusMessage);
      console.log(`📡 Status gesendet an Client: ${onlineUsers.length} online Benutzer`);
    } catch (error) {
      console.error('Error sending current status:', error);
    }
  }

  isUserOnline(userId: number): boolean {
    const user = this.connectedUsers.get(userId);
    if (!user) return false;
    
    // Prüfe, ob WebSocket aktiv ist
    const isSocketReady = user.socket && user.socket.readyState === WebSocket.OPEN;
    
    // Debug-Output für bessere Nachverfolgung
    if (!isSocketReady && user) {
      console.log(`🔍 User ${userId} (${user.username}) ist in Map, aber WebSocket Status: ${user.socket?.readyState || 'null'}`);
    }
    
    return isSocketReady && user.isActive;
  }

  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  // Broadcast Cache-Invalidierung bei Shop-Änderungen
  broadcastEmployeeUpdate(affectedShopIds: number[], eventType: 'transfer' | 'delete' | 'update') {
    const message = JSON.stringify({
      type: 'employee_update',
      eventType,
      affectedShopIds,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Broadcasting employee update (${eventType}) to shops: ${affectedShopIds.join(', ')}`);

    // An alle verbundenen Clients senden
    for (const user of this.connectedUsers.values()) {
      if (user.socket && user.socket.readyState === WebSocket.OPEN) {
        try {
          user.socket.send(message);
        } catch (error) {
          console.error('Error broadcasting employee update:', error);
        }
      }
    }
  }

  getUserLastSeen(userId: number): Date | null {
    const user = this.connectedUsers.get(userId);
    return user ? user.lastHeartbeat : null;
  }

  // NEUE METHODE: Prüft ob echte Kiosk-Geräte verfügbar sind
  hasActiveKiosks(): boolean {
    const activeKiosks = Array.from(this.connectedUsers.values()).filter(user => 
      user.isKiosk && user.socket && user.socket.readyState === WebSocket.OPEN
    );
    return activeKiosks.length > 0;
  }

  // NEUE METHODE: Anzahl der aktiven Kiosk-Geräte
  getActiveKioskCount(): number {
    return Array.from(this.connectedUsers.values()).filter(user => 
      user.isKiosk && user.socket && user.socket.readyState === WebSocket.OPEN
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
      if (user && user.socket && user.socket.readyState === WebSocket.OPEN) {
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
      if (user.socket && user.socket.readyState === WebSocket.OPEN) {
        try {
          user.socket.send(messageString);
          console.log(`✅ Kiosk-Nachricht gesendet an ${user.username} (${user.userId})`);
        } catch (error) {
          console.error(`❌ Fehler beim Senden an Kiosk ${user.username}:`, error);
        }
      } else {
        console.warn(`⚠️ Kiosk-WebSocket nicht bereit: ${user.username} (Status: ${user.socket?.readyState || 'null'})`);
      }
    }
  }

  // Send message to specific kiosk by ID
  sendToSpecificKiosk(kioskId: number, message: any): boolean {
    const user = this.connectedUsers.get(kioskId);
    
    if (!user) {
      console.warn(`❌ Kiosk ${kioskId} nicht verbunden`);
      return false;
    }
    
    if (!user.isKiosk) {
      console.warn(`❌ Benutzer ${kioskId} ist kein Kiosk`);
      return false;
    }
    
    if (!user.socket || user.socket.readyState !== WebSocket.OPEN) {
      console.warn(`❌ Kiosk ${kioskId} WebSocket nicht bereit (Status: ${user.socket?.readyState})`);
      return false;
    }
    
    try {
      const messageString = JSON.stringify(message);
      user.socket.send(messageString);
      console.log(`✅ Nachricht erfolgreich an Kiosk ${kioskId} (${user.username}) gesendet`);
      return true;
    } catch (error) {
      console.error(`❌ Fehler beim Senden an Kiosk ${kioskId}:`, error);
      return false;
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

  // Direkte ACK-Verarbeitung für Mock-Sockets (ohne WebSocket Parameter)
  private handleSignatureAckDirect(message: any): void {
    if (!message) {
      console.error('❌ handleSignatureAckDirect: Nachricht ist undefined');
      return;
    }
    
    const { tempId, status, kioskId, timestamp } = message;
    
    console.log(`✅ Kiosk: ACK empfangen - tempId: ${tempId}, status: ${status}, kioskId: ${kioskId}`);
    
    // Log für DSGVO & Debugging
    console.log(`[SIGNATURE-LOG] ACK received - tempId: ${tempId}, status: ${status}, kioskId: ${kioskId}, timestamp: ${timestamp}`);
    
    // ACK an alle PCs weiterleiten
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
      user.lastHeartbeat = new Date();
      user.isActive = true;
      console.log(`🛠️ DEBUG: Kiosk ${userId} (${user.username}) force-registered`);
    } else {
      // Erstelle temporären Benutzer für Force-Registration mit Mock-Socket
      const mockSocket = {
        readyState: 1, // WebSocket.OPEN
        send: (message: string) => {
          const parsedMessage = JSON.parse(message);
          console.log(`🎭 DEBUG: Mock-Socket für Kiosk ${userId} empfängt:`, parsedMessage.type);
          
          // Simuliere realistische Kiosk-Antworten
          if (parsedMessage.type === 'signature-request') {
            // Simuliere dass Kiosk die Unterschriftsseite öffnet
            setTimeout(() => {
              console.log(`🎭 DEBUG: Mock-Kiosk ${userId} sendet ACK-Antwort`);
              
              // Sende ACK zurück an WebSocket-Manager (simuliert Kiosk-Browser)
              const ackMessage = {
                type: 'signature-ack',
                status: 'opened',
                kioskId: `debug-kiosk-${userId}`,
                tempId: parsedMessage.payload?.tempId || undefined,
                timestamp: Date.now()
              };
              
              // Simuliere Kiosk-ACK durch direkten Callback
              this.handleSignatureAckDirect(ackMessage);
            }, 200);
          }
        },
        close: () => console.log(`🎭 DEBUG: Mock-Socket ${userId} geschlossen`)
      } as any;

      const tempUser: ConnectedUser = {
        userId,
        username: `debug-kiosk-${userId}`,
        socket: mockSocket,
        lastHeartbeat: new Date(),
        isActive: true,
        isKiosk: true
      };
      this.connectedUsers.set(userId, tempUser);
      console.log(`🛠️ DEBUG: Kiosk ${userId} force-registered als Temp-User mit Mock-Socket`);
    }
    
    // Regelmäßige Heartbeat-Updates für Debug-Kiosks
    this.setupDebugHeartbeat(userId);
  }
  
  // Hält Debug-Kiosks künstlich "am Leben"
  private setupDebugHeartbeat(userId: number): void {
    setInterval(() => {
      const user = this.connectedUsers.get(userId);
      if (user && user.username?.startsWith('debug-kiosk-')) {
        user.lastHeartbeat = new Date();
        user.isActive = true;
      }
    }, 5000); // Alle 5 Sekunden Heartbeat-Update
  }

  // Debug-Methode um zu sehen welche Benutzer registriert sind
  getRegisteredUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }
  
  // NEUE METHODE: Forciere Kiosk-Registrierung für Debug-Zwecke
  forceRegisterKiosk(userId: number): boolean {
    const user = this.connectedUsers.get(userId);
    if (!user) {
      console.log(`❌ forceRegisterKiosk: User ${userId} nicht in connectedUsers Map`);
      return false;
    }
    
    user.isKiosk = true;
    user.isActive = true;
    console.log(`🛠️ DEBUG: Kiosk ${userId} (${user.username}) wurde manuell registriert`);
    console.log(`🛠️ WebSocket-Status: ${user.socket?.readyState} (1=OPEN)`);
    
    return true;
  }

  // Prüfen ob ein Benutzer online ist
  isUserOnline(userId: number): boolean {
    const user = this.connectedUsers.get(userId);
    if (!user) return false;
    
    // WebSocket-Status und Aktivität prüfen
    const hasValidSocket = user.socket && user.socket.readyState === 1; // WebSocket.OPEN
    const isRecentlyActive = user.isActive && user.lastHeartbeat && 
                           (new Date().getTime() - user.lastHeartbeat.getTime()) < 60000; // 60 Sekunden
    
    return hasValidSocket && isRecentlyActive;
  }

  // Broadcast an alle Clients eines bestimmten Shops
  async broadcastToShop(shopId: number, message: any): Promise<void> {
    try {
      let sentCount = 0;
      
      // Iteriere über alle verbundenen Benutzer und prüfe ihre Shop-Zugehörigkeit
      for (const connectedUser of this.connectedUsers.values()) {
        if (connectedUser.socket.readyState === 1) {
          try {
            // Prüfe Shop-Zugehörigkeit über die Datenbank
            const user = await storage.getUser(connectedUser.userId);
            if (user && user.shopId === shopId) {
              connectedUser.socket.send(JSON.stringify(message));
              sentCount++;
            }
          } catch (error) {
            console.error(`Fehler beim Senden an User ${connectedUser.userId}:`, error);
          }
        }
      }
      
      console.log(`📡 Nachricht an ${sentCount} Clients in Shop ${shopId} gesendet`);
    } catch (error) {
      console.error(`Fehler beim Shop-Broadcast für Shop ${shopId}:`, error);
    }
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

// Broadcast-Funktion für Ersatzteil-Updates
export function broadcastSparePartUpdate(updateData: {
  id: number;
  status: string;
  archived: boolean;
  shopId: number;
  repairId?: number;
  updatedBy: string;
}) {
  if (!onlineStatusManager) {
    console.warn('WebSocket-Manager nicht initialisiert');
    return;
  }

  const message = {
    type: 'spare-part-update',
    data: updateData
  };

  onlineStatusManager.broadcast(message);
  console.log(`Ersatzteil-Update gesendet für Shop ${updateData.shopId}:`, updateData);
}

// Broadcast-Funktion für Reparatur-Status-Updates
export function broadcastRepairStatusUpdate(updateData: {
  id: number;
  status: string;
  oldStatus: string;
  shopId: number;
  orderCode: string;
  updatedBy: string;
  estimatedCost?: string;
}) {
  if (!onlineStatusManager) {
    console.warn('WebSocket-Manager nicht initialisiert');
    return;
  }

  const message = {
    type: 'repair-status-update',
    data: updateData
  };

  onlineStatusManager.broadcast(message);
  console.log(`🔄 Reparatur-Status-Update gesendet für Shop ${updateData.shopId}: ${updateData.orderCode} (${updateData.oldStatus} → ${updateData.status})`);
}