import type { Express, Request, Response } from "express";
import { storage } from "./storage";
// Middleware for authentication
async function isAuthenticated(req: Request, res: Response, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Nicht angemeldet" });
  }
  next();
}
import { z } from "zod";
import * as emailService from "./email-service";

// Schemas für 2FA Validierung
const setupTwoFASchema = z.object({
  method: z.enum(['email', 'totp'])
});

const verifyTwoFASchema = z.object({
  method: z.enum(['email', 'totp']),
  code: z.string().min(6).max(6)
});

export function registerTwoFARoutes(app: Express) {
  
  // 2FA Status für aktuellen Benutzer abrufen
  app.get("/api/2fa/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      res.json({
        emailEnabled: user.twoFaEmailEnabled || false,
        totpEnabled: user.twoFaTotpEnabled || false,
        hasBackupCodes: Array.isArray(user.backupCodes) && user.backupCodes.length > 0
      });
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      res.status(500).json({ message: "Fehler beim Abrufen des 2FA-Status" });
    }
  });

  // 2FA einrichten
  app.post("/api/2fa/setup", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const { method } = setupTwoFASchema.parse(req.body);

      if (method === 'email') {
        const success = await storage.setupEmailTwoFA(req.user.id);
        
        if (success) {
          res.json({ 
            message: "E-Mail 2FA erfolgreich aktiviert",
            method: 'email'
          });
        } else {
          res.status(500).json({ message: "Fehler beim Aktivieren der E-Mail 2FA" });
        }
      } else if (method === 'totp') {
        const { secret, backupCodes } = await storage.setupTOTPTwoFA(req.user.id);
        
        res.json({
          message: "TOTP 2FA erfolgreich eingerichtet",
          method: 'totp',
          secret: secret,
          backupCodes: backupCodes,
          qrCodeUrl: `otpauth://totp/Handyshop:${req.user.username}?secret=${secret}&issuer=Handyshop`
        });
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Ungültige Daten", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Fehler beim Einrichten der 2FA" });
    }
  });

  // E-Mail 2FA Code generieren und senden
  app.post("/api/2fa/send-email-code", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.twoFaEmailEnabled) {
        return res.status(400).json({ message: "E-Mail 2FA ist nicht aktiviert" });
      }

      if (!user.email) {
        return res.status(400).json({ message: "Keine E-Mail-Adresse hinterlegt" });
      }

      const code = await storage.generateEmailTwoFACode(req.user.id);
      
      // E-Mail mit 2FA Code senden über SystemEmail
      const { EmailService } = await import('./email-service');
      const emailService = new EmailService();
      const emailSent = await emailService.sendSystemEmail({
        to: user.email,
        subject: "Ihr 2FA-Verifizierungscode",
        html: `
          <h2>2FA-Verifizierungscode</h2>
          <p>Ihr Verifizierungscode lautet:</p>
          <h1 style="font-size: 32px; color: #007bff; letter-spacing: 4px;">${code}</h1>
          <p>Dieser Code ist 10 Minuten gültig.</p>
        `,
        text: `Ihr 2FA-Verifizierungscode: ${code}\n\nDieser Code ist 10 Minuten gültig.`
      });

      if (emailSent) {
        res.json({ message: "2FA-Code wurde per E-Mail gesendet" });
      } else {
        res.status(500).json({ message: "Fehler beim Senden der E-Mail" });
      }
    } catch (error) {
      console.error('Error sending email 2FA code:', error);
      res.status(500).json({ message: "Fehler beim Senden des 2FA-Codes" });
    }
  });

  // 2FA Code verifizieren
  app.post("/api/2fa/verify", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const { method, code } = verifyTwoFASchema.parse(req.body);

      let isValid = false;

      if (method === 'email') {
        isValid = await storage.verifyEmailTwoFACode(req.user.id, code);
      } else if (method === 'totp') {
        isValid = await storage.verifyTOTP(req.user.id, code);
      }

      if (isValid) {
        res.json({ 
          valid: true, 
          message: "2FA-Code erfolgreich verifiziert" 
        });
      } else {
        res.status(400).json({ 
          valid: false, 
          message: "Ungültiger oder abgelaufener 2FA-Code" 
        });
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Ungültige Daten", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Fehler beim Verifizieren des 2FA-Codes" });
    }
  });

  // 2FA deaktivieren
  app.post("/api/2fa/disable", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const success = await storage.disableTwoFA(req.user.id);
      
      if (success) {
        res.json({ message: "2FA erfolgreich deaktiviert" });
      } else {
        res.status(500).json({ message: "Fehler beim Deaktivieren der 2FA" });
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ message: "Fehler beim Deaktivieren der 2FA" });
    }
  });

  // 2FA für einen anderen Benutzer deaktivieren (nur für Superadmins)
  app.post("/api/2fa/disable-for-user/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.isSuperadmin) {
        return res.status(403).json({ message: "Keine Berechtigung" });
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      const success = await storage.disableTwoFA(userId);
      
      if (success) {
        res.json({ message: "2FA für Benutzer erfolgreich deaktiviert" });
      } else {
        res.status(500).json({ message: "Fehler beim Deaktivieren der 2FA" });
      }
    } catch (error) {
      console.error('Error disabling 2FA for user:', error);
      res.status(500).json({ message: "Fehler beim Deaktivieren der 2FA" });
    }
  });
}