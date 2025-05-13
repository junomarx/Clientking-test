import { Express, Request, Response } from "express";
import { storage } from "./storage";

/**
 * Notfall-Authentifizierungssystem 
 * Fügt einfache Login/Logout-Routen für den Notfallzugang hinzu
 */
export function setupEmergencyAuth(app: Express) {
  console.log("🚨 NOTFALL-AUTHENTIFIZIERUNG wird aktiviert!");
  
  // Direkter Login ohne Passwort-Verifikation für bugi
  app.post("/api/emergency-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      console.log(`⚙️ Notfall-Login-Anfrage für Benutzer: ${username}`);
      
      // Nur für bugi mit password erlauben
      if (username !== "bugi" || password !== "password") {
        console.log(`❌ Notfall-Login verweigert für: ${username}`);
        return res.status(401).json({ message: "Ungültiger Benutzername oder Passwort" });
      }
      
      // Benutzer abrufen
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`❌ Notfall-Login fehlgeschlagen: Benutzer ${username} nicht gefunden`);
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Benutzer manuell in Session speichern
      // @ts-ignore
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Notfall-Login Session-Speicherfehler:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Benutzer-Informationen zurückgeben (ohne Passwort)
      const { password: _, ...userWithoutPassword } = user;
      
      // Einfachen Token generieren
      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
      
      console.log(`✅ Notfall-Login erfolgreich für ${username} (ID: ${user.id})`);
      
      // Antwortobjekt erstellen
      const responseObj = {
        ...userWithoutPassword,
        token
      };
      
      // Debug-Info ausgeben
      console.log("Sende Token zurück:", token.substring(0, 15) + "...");
      console.log("Benutzer-ID in Session gespeichert:", user.id);
      
      return res.status(200).json(responseObj);
    } catch (error) {
      console.error("❌ Unerwarteter Fehler beim Notfall-Login:", error);
      return res.status(500).json({ message: "Interner Serverfehler" });
    }
  });
  
  // Direkter Logout für Notfallsituationen
  app.post("/api/emergency-logout", (req: Request, res: Response) => {
    try {
      // @ts-ignore
      req.session.userId = null;
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Fehler beim Notfall-Logout:", err);
          return res.status(500).json({ message: "Fehler beim Abmelden" });
        }
        console.log("✅ Notfall-Logout erfolgreich");
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Erfolgreich abgemeldet" });
      });
    } catch (error) {
      console.error("❌ Unerwarteter Fehler beim Notfall-Logout:", error);
      return res.status(500).json({ message: "Interner Serverfehler" });
    }
  });
  
  // Test-Route, um zu prüfen ob ein Benutzer angemeldet ist
  app.get("/api/emergency-user", async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      console.log(`✅ Notfall-Benutzer-Info abgerufen für ID: ${userId}`);
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen des Notfall-Benutzers:", error);
      return res.status(500).json({ message: "Interner Serverfehler" });
    }
  });
  
  console.log("🚨 NOTFALL-AUTHENTIFIZIERUNG ist aktiviert!");
}