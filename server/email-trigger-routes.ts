/**
 * E-Mail-Trigger-Routen - Ermöglicht die Konfiguration, welche E-Mail-Vorlage
 * bei welchem Reparaturstatus automatisch gesendet werden soll
 */
import { Request, Response, Router } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./middleware/auth";

const router = Router();

// Alle E-Mail-Trigger abrufen
router.get("/api/email-triggers", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Benutzer-ID aus der Authentifizierungsinformation extrahieren
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const triggers = await storage.getAllEmailTriggers(userId);
    return res.status(200).json(triggers);
  } catch (error) {
    console.error("Error retrieving email triggers:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Einen bestimmten E-Mail-Trigger abrufen
router.get("/api/email-triggers/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid trigger ID" });
    }
    
    // Benutzer-ID aus der Authentifizierungsinformation extrahieren
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const trigger = await storage.getEmailTrigger(id, userId);
    if (!trigger) {
      return res.status(404).json({ error: "Email trigger not found" });
    }
    
    return res.status(200).json(trigger);
  } catch (error) {
    console.error("Error retrieving email trigger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Einen E-Mail-Trigger anhand des Reparaturstatus abrufen
router.get("/api/email-triggers/status/:status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const status = req.params.status;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    
    // Benutzer-ID aus der Authentifizierungsinformation extrahieren
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const trigger = await storage.getEmailTriggerByStatus(status, userId);
    if (!trigger) {
      return res.status(404).json({ error: "No email trigger found for this status" });
    }
    
    return res.status(200).json(trigger);
  } catch (error) {
    console.error("Error retrieving email trigger by status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Einen neuen E-Mail-Trigger erstellen
router.post("/api/email-triggers", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Einfache Validierung
    const { repairStatus, emailTemplateId, active } = req.body;
    if (!repairStatus || !emailTemplateId) {
      return res.status(400).json({ error: "Repair status and email template ID are required" });
    }
    
    // Benutzer-ID aus der Authentifizierungsinformation extrahieren
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Optional: Überprüfen, ob die Vorlage existiert
    const template = await storage.getEmailTemplate(emailTemplateId, userId);
    if (!template) {
      return res.status(404).json({ error: "Email template not found" });
    }
    
    const trigger = await storage.createEmailTrigger({
      repairStatus,
      emailTemplateId,
      active: active !== undefined ? active : true,
    }, userId);
    
    return res.status(201).json(trigger);
  } catch (error) {
    console.error("Error creating email trigger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Einen E-Mail-Trigger aktualisieren
router.patch("/api/email-triggers/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid trigger ID" });
    }
    
    // Benutzer-ID aus der Authentifizierungsinformation extrahieren
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Aktualisierbare Felder
    const { repairStatus, emailTemplateId, active } = req.body;
    
    const updatedTrigger = await storage.updateEmailTrigger(id, {
      repairStatus,
      emailTemplateId,
      active,
    }, userId);
    
    if (!updatedTrigger) {
      return res.status(404).json({ error: "Email trigger not found or could not be updated" });
    }
    
    return res.status(200).json(updatedTrigger);
  } catch (error) {
    console.error("Error updating email trigger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Einen E-Mail-Trigger löschen
router.delete("/api/email-triggers/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid trigger ID" });
    }
    
    // Benutzer-ID aus der Authentifizierungsinformation extrahieren
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const success = await storage.deleteEmailTrigger(id, userId);
    if (!success) {
      return res.status(404).json({ error: "Email trigger not found or could not be deleted" });
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting email trigger:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;