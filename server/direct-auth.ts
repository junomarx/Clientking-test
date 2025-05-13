/**
 * Einfache direkte Authentifizierung ohne Session oder Passport
 * Nur für den Notfall und Debugging-Zwecke
 */

import { Express, Request, Response } from "express";
import { storage } from "./storage";

// Notfall-Authentifizierung
export function setupDirectAuth(app: Express) {
  console.log("🔑 Direkte Authentifizierung wird eingerichtet (für Notfälle)");
  
  // Direkter Login-Endpunkt für Notfälle
  app.post("/api/direct-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      // Nur für bugi mit password erlauben
      if (username !== "bugi" || password !== "password") {
        return res.status(401).json({ 
          success: false, 
          message: "Ungültige Anmeldedaten"
        });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Benutzer nicht gefunden" 
        });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      // Direkter statischer Token zum Testen
      const staticToken = "bugi-notfall-token-123";
      
      // Erfolgreiche Antwort
      return res.status(200).json({
        success: true,
        message: "Notfall-Anmeldung erfolgreich",
        user: userWithoutPassword,
        token: staticToken
      });
    } catch (error) {
      console.error("Fehler bei der direkten Anmeldung:", error);
      return res.status(500).json({ 
        success: false,
        message: "Serverfehler bei der Anmeldung"
      });
    }
  });
  
  // API zum Abrufen des aktuellen Benutzers (mit Token)
  app.get("/api/direct-user", async (req: Request, res: Response) => {
    try {
      // Header prüfen (Authorization: Bearer TOKEN)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false,
          message: "Keine Authentifizierung angegeben" 
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      // Prüfen, ob der Token der statische Notfall-Token ist
      if (token !== "bugi-notfall-token-123") {
        return res.status(401).json({ 
          success: false, 
          message: "Ungültiger oder abgelaufener Token" 
        });
      }
      
      // Benutzer abrufen
      const user = await storage.getUserByUsername("bugi");
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Notfall-Benutzer nicht gefunden" 
        });
      }
      
      // Benutzerinformationen ohne Passwort zurückgeben
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Benutzers:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Serverfehler beim Abrufen des Benutzers" 
      });
    }
  });
  
  // Logout-Endpunkt (tut nichts, da wir keine Sessions verwenden)
  app.post("/api/direct-logout", (_req: Request, res: Response) => {
    return res.status(200).json({ 
      success: true, 
      message: "Erfolgreich abgemeldet" 
    });
  });
  
  console.log("🔑 Direkte Authentifizierung ist eingerichtet");
}