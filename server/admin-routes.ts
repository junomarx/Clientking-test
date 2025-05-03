import { Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage";
import { ZodError } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { deviceIssues, insertDeviceIssueSchema, userDeviceTypes, userBrands, userModelSeries, userModels, businessSettings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
// CSV-Bibliotheken werden nicht mehr benötigt, da wir JSON verwenden

// Helper-Funktion für das Passwort-Hashing
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Middleware zum Prüfen, ob der Benutzer ein Administrator ist
function isAdmin(req: Request, res: Response, next: NextFunction) {
  // Prüfe auf benutzerdefinierte User-ID im Header (für direktes Debugging)
  const customUserId = req.headers['x-user-id'];
  if (customUserId) {
    console.log(`Admin-Bereich: X-User-ID Header gefunden: ${customUserId}`);
    // Wenn wir eine Benutzer-ID im Header haben, versuchen wir, den Benutzer zu laden
    try {
      const userId = parseInt(customUserId.toString());
      storage.getUser(userId).then(user => {
        if (user) {
          console.log(`Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
          if (user.isAdmin) {
            console.log(`Admin-Bereich: Admin-Benutzer mit ID ${userId} gefunden: ${user.username}`);
            req.user = user;
            return next();
          } else {
            console.log(`Admin-Bereich: Benutzer ist kein Administrator`);
            return res.status(403).json({ message: "Keine Administratorrechte" });
          }
        } else {
          console.log(`Benutzer mit ID ${userId} nicht gefunden`);
          return res.status(404).json({ message: "Benutzer nicht gefunden" });
        }
      }).catch(err => {
        console.error('Admin-Bereich: Fehler beim Verarbeiten der X-User-ID:', err);
        return res.status(401).json({ message: "Nicht angemeldet" });
      });
      return; // Wichtig: Früher Return, da wir asynchron arbeiten
    } catch (error) {
      console.error('Admin-Bereich: Fehler beim Verarbeiten der X-User-ID:', error);
    }
  }
  
  // Standardmäßig die Session-Authentifizierung prüfen
  if (!req.isAuthenticated()) {
    // Als Fallback, versuche die Token-Authentifizierung
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = Buffer.from(token, 'base64').toString();
        const tokenParts = decoded.split(':');
        
        if (tokenParts.length < 2) {
          return res.status(401).json({ message: "Ungültiges Token-Format" });
        }
        
        const userId = parseInt(tokenParts[0]);
        
        // Benutzer aus der Datenbank abrufen
        storage.getUser(userId).then(user => {
          if (!user) {
            return res.status(401).json({ message: "Benutzer nicht gefunden" });
          }
          
          if (!user.isAdmin) {
            return res.status(403).json({ message: "Keine Administratorrechte" });
          }
          
          // Benutzer in Request setzen
          req.user = user;
          return next();
        }).catch(err => {
          console.error('Admin-Bereich: Token-Auth Fehler:', err);
          return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
        });
        return; // Wichtig: Früher Return, da wir asynchron arbeiten
      } catch (error) {
        console.error('Admin-Bereich: Token-Auth Fehler:', error);
        return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
      }
    } else {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
  } else if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Keine Administratorrechte" });
  } else {
    next();
  }
}

export function registerAdminRoutes(app: Express) {
  //==========================================================================
  // FEHLERBESCHREIBUNGEN (DEVICE ISSUES) ROUTES - Nur für Admin (Bugi)
  //==========================================================================
  // Alle Fehlerbeschreibungen abrufen (gruppiert nach Geräteart)
  app.get("/api/admin/device-issues", isAdmin, async (req: Request, res: Response) => {
    try {
      // Alle Fehlerbeschreibungen aus der Datenbank abrufen
      const allIssues = await db.select().from(deviceIssues);
      // Nach Gerätetyp und Beschreibung sortieren
      allIssues.sort((a, b) => {
        if (a.deviceType !== b.deviceType) {
          return a.deviceType.localeCompare(b.deviceType);
        }
        return a.description.localeCompare(b.description);
      });
      
      // Nach Gerätetyp gruppieren für bessere Frontend-Darstellung
      const issuesByDeviceType: {[key: string]: any[]} = {};
      
      allIssues.forEach(issue => {
        if (!issuesByDeviceType[issue.deviceType]) {
          issuesByDeviceType[issue.deviceType] = [];
        }
        issuesByDeviceType[issue.deviceType].push(issue);
      });
      
      res.json(issuesByDeviceType);
    } catch (error) {
      console.error("Error retrieving device issues:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  // Fehlerbeschreibungen für einen bestimmten Gerätetyp abrufen
  app.get("/api/admin/device-issues/:deviceType", isAdmin, async (req: Request, res: Response) => {
    try {
      const deviceType = req.params.deviceType;
      
      // Alle Fehlerbeschreibungen für diesen Gerätetyp abrufen
      const issues = await db.select().from(deviceIssues)
        .where(eq(deviceIssues.deviceType, deviceType));
      
      // Sortieren nach Beschreibung
      issues.sort((a, b) => a.description.localeCompare(b.description));
      
      res.json(issues);
    } catch (error) {
      console.error("Error retrieving device issues for type:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  // Fehlerbeschreibung erstellen
  app.post("/api/admin/device-issues", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf Fehlerbeschreibungen erstellen (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Fehlerbeschreibungen erstellen" });
      }
      
      const issueData = insertDeviceIssueSchema.parse(req.body);
      
      // Prüfen, ob die Fehlerbeschreibung bereits existiert
      const existingIssue = await db.select().from(deviceIssues)
        .where(and(
          eq(deviceIssues.description, issueData.description),
          eq(deviceIssues.deviceType, issueData.deviceType)
        ));
      
      if (existingIssue.length > 0) {
        return res.status(400).json({ message: "Diese Fehlerbeschreibung existiert bereits für diesen Gerätetyp" });
      }
      
      // Fehlerbeschreibung in der Datenbank speichern
      const [newIssue] = await db.insert(deviceIssues).values(issueData).returning();
      
      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Error creating device issue:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Fehlerbeschreibungsdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Erstellen der Fehlerbeschreibung" });
    }
  });
  
  // Fehlerbeschreibung aktualisieren
  app.patch("/api/admin/device-issues/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf Fehlerbeschreibungen aktualisieren (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Fehlerbeschreibungen aktualisieren" });
      }
      
      const id = parseInt(req.params.id);
      const issueData = insertDeviceIssueSchema.partial().parse(req.body);
      
      // Prüfen, ob die Fehlerbeschreibung existiert
      const [existingIssue] = await db.select().from(deviceIssues).where(eq(deviceIssues.id, id));
      
      if (!existingIssue) {
        return res.status(404).json({ message: "Fehlerbeschreibung nicht gefunden" });
      }
      
      // Fehlerbeschreibung aktualisieren
      const [updatedIssue] = await db.update(deviceIssues)
        .set({
          ...issueData,
          updatedAt: new Date()
        })
        .where(eq(deviceIssues.id, id))
        .returning();
      
      res.json(updatedIssue);
    } catch (error) {
      console.error("Error updating device issue:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Fehlerbeschreibungsdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Aktualisieren der Fehlerbeschreibung" });
    }
  });
  
  // Fehlerbeschreibung löschen
  app.delete("/api/admin/device-issues/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf Fehlerbeschreibungen löschen (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Fehlerbeschreibungen löschen" });
      }
      
      const id = parseInt(req.params.id);
      
      // Prüfen, ob die Fehlerbeschreibung existiert
      const [existingIssue] = await db.select().from(deviceIssues).where(eq(deviceIssues.id, id));
      
      if (!existingIssue) {
        return res.status(404).json({ message: "Fehlerbeschreibung nicht gefunden" });
      }
      
      // Fehlerbeschreibung löschen
      await db.delete(deviceIssues).where(eq(deviceIssues.id, id));
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting device issue:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Fehlerbeschreibung" });
    }
  });
  
  // Öffentlicher Endpunkt für alle Benutzer, um Fehlerbeschreibungen für einen bestimmten Gerätetyp abzurufen
  app.get("/api/device-issues/:deviceType", async (req: Request, res: Response) => {
    try {
      const deviceType = req.params.deviceType;
      
      // Alle Fehlerbeschreibungen für diesen Gerätetyp abrufen
      const issues = await db.select().from(deviceIssues)
        .where(eq(deviceIssues.deviceType, deviceType));
      
      // Sortieren nach Beschreibung
      issues.sort((a, b) => a.description.localeCompare(b.description));
      
      // Nur die description zurückgeben für einfache Verwendung
      const issueDescriptions = issues.map(issue => issue.description);
      
      res.json(issueDescriptions);
    } catch (error) {
      console.error("Error retrieving device issues for type:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  //==========================================================================
  // EXPORT/IMPORT ROUTEN
  //==========================================================================
  // Alle Gerätetypen, Marken, Modellreihen und Modelle als CSV exportieren
  app.get("/api/admin/device-management/export", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf exportieren (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Gerätedaten exportieren" });
      }
      
      // Alle Gerätetypen abrufen
      const allDeviceTypes = await db.select().from(userDeviceTypes);
      // Alle Marken abrufen
      const allBrands = await db.select().from(userBrands);
      // Alle Modellreihen abrufen
      const allModelSeries = await db.select().from(userModelSeries);
      // Alle Modelle abrufen
      const allModels = await db.select().from(userModels);
      
      // Daten als JSON-Datei vorbereiten (kein CSV, da die Struktur zu komplex ist)
      const jsonData = {
        deviceTypes: allDeviceTypes,
        brands: allBrands,
        modelSeries: allModelSeries,
        models: allModels
      };
      
      // JSON-String erzeugen
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      // Datei zum Download bereitstellen
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=device-management-data.json');
      res.send(jsonString);
    } catch (error) {
      console.error("Error exporting device data:", error);
      res.status(500).json({ message: "Fehler beim Exportieren der Gerätedaten" });
    }
  });
  
  // Gerätetypen, Marken, Modellreihen und Modelle aus CSV importieren
  app.post("/api/admin/device-management/import", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf importieren (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Gerätedaten importieren" });
      }
      
      // JSON-Daten aus der Anfrage auslesen
      const jsonString = req.body.jsonData;
      
      if (!jsonString) {
        return res.status(400).json({ message: "Keine JSON-Daten gefunden" });
      }
      
      let jsonData;
      try {
        // JSON-String parsen
        jsonData = JSON.parse(jsonString);
        console.log("Import-Daten erhalten:", Object.keys(jsonData));
        
        // Debug-Ausgabe für die ersten Einträge, um deren Struktur zu untersuchen
        if (jsonData.deviceTypes && jsonData.deviceTypes.length > 0) {
          console.log("Beispiel deviceType:", jsonData.deviceTypes[0]);
        }
        if (jsonData.brands && jsonData.brands.length > 0) {
          console.log("Beispiel brand:", jsonData.brands[0]);
        }
        if (jsonData.modelSeries && jsonData.modelSeries.length > 0) {
          console.log("Beispiel modelSeries:", jsonData.modelSeries[0]);
        }
        if (jsonData.models && jsonData.models.length > 0) {
          console.log("Beispiel model:", jsonData.models[0]);
        }
        
        // Prüfe, ob alle referenzierten Gerätetyp-IDs in den importierten Gerätetypen existieren
        const deviceTypeIds = new Set(jsonData.deviceTypes?.map((dt: any) => dt.id) || []);
        const missingDeviceTypeIds = [];
        
        if (jsonData.brands && jsonData.brands.length > 0) {
          for (const brand of jsonData.brands) {
            if (!deviceTypeIds.has(brand.deviceTypeId)) {
              missingDeviceTypeIds.push(brand.deviceTypeId);
              console.warn(`Warnung: Marke '${brand.name}' (ID: ${brand.id}) referenziert einen Gerätetyp mit ID ${brand.deviceTypeId}, der nicht im Import enthalten ist.`);
            }
          }
        }
        
        if (missingDeviceTypeIds.length > 0) {
          console.warn(`Es wurden ${missingDeviceTypeIds.length} Gerätetyp-IDs in Marken referenziert, die nicht im Import enthalten sind.`);
          console.warn(`Dies wird wahrscheinlich zu Fehlern führen, weil die Fremdschlüssel-Beziehungen nicht erfüllt werden können.`);
        }
      } catch (e) {
        console.error("JSON parse error:", e);
        return res.status(400).json({ message: "Ungültiges JSON-Format" });
      }
      
      if (!jsonData) {
        return res.status(400).json({ message: "Keine gültigen Daten in der JSON-Datei gefunden" });
      }
      
      // Daten aus dem JSON extrahieren
      const { deviceTypes: importDeviceTypes, brands: importBrands, modelSeries: importModelSeries, models: importModels } = jsonData;
      
      // Statistiken für die Rückmeldung
      const stats = {
        deviceTypes: 0,
        brands: 0,
        modelSeries: 0,
        models: 0
      };
      
      try {
        // Vor dem Import holen wir vorhandene Gerätetypen, um sie wiederzuverwenden
        // Dadurch vermeiden wir das Problem der doppelten Gerätetypen
        const existingDeviceTypes = await db
          .select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.userId, req.user?.id || 3));
        
        // Mapping von Namen zu existierenden Gerätetypen erstellen
        const existingDeviceTypesByName = new Map(
          existingDeviceTypes.map(dt => [dt.name, dt])
        );
        
        console.log(`${existingDeviceTypes.length} vorhandene Gerätetypen gefunden für Benutzer ${req.user?.id || 3}.`);        
        
        // Wir holen alle vorhandenen Daten, um sie beim Import zu berücksichtigen
        console.log("Hole vorhandene Daten...");
        
        // Vorhandene Marken sammeln
        const existingBrands = await db
          .select()
          .from(userBrands)
          .where(eq(userBrands.userId, req.user?.id || 3));
          
        // Mapping von (Name + deviceTypeId) zu existierenden Marken erstellen
        const existingBrandsByKey = new Map();
        existingBrands.forEach(brand => {
          const key = `${brand.name}-${brand.deviceTypeId}`;
          existingBrandsByKey.set(key, brand);
        });
        console.log(`${existingBrands.length} vorhandene Marken gefunden für Benutzer ${req.user?.id || 3}.`);        
        
        // Vorhandene Modellreihen sammeln
        const existingModelSeries = await db
          .select()
          .from(userModelSeries)
          .where(eq(userModelSeries.userId, req.user?.id || 3));
          
        // Mapping von (Name + brandId) zu existierenden Modellreihen erstellen
        const existingModelSeriesByKey = new Map();
        existingModelSeries.forEach(ms => {
          const key = `${ms.name}-${ms.brandId}`;
          existingModelSeriesByKey.set(key, ms);
        });
        console.log(`${existingModelSeries.length} vorhandene Modellreihen gefunden für Benutzer ${req.user?.id || 3}.`);        
        
        // Vorhandene Modelle sammeln
        const existingModels = await db
          .select()
          .from(userModels)
          .where(eq(userModels.userId, req.user?.id || 3));
          
        // Mapping von (Name + modelSeriesId) zu existierenden Modellen erstellen
        const existingModelsByKey = new Map();
        existingModels.forEach(model => {
          const key = `${model.name}-${model.modelSeriesId}`;
          existingModelsByKey.set(key, model);
        });
        console.log(`${existingModels.length} vorhandene Modelle gefunden für Benutzer ${req.user?.id || 3}.`);
        
        // Mapping für alte und neue IDs erstellen
        const idMappings: {
          deviceTypes: Map<number, number>;
          brands: Map<number, number>;
          modelSeries: Map<number, number>;
        } = {
          deviceTypes: new Map(),
          brands: new Map(),
          modelSeries: new Map()
        };

        // Gerätetypen importieren - mit Wiederverwendung vorhandener Einträge
        if (importDeviceTypes && importDeviceTypes.length > 0) {
          // Initialisiere Arrays für neue und vorhandene Gerätetypen
          const deviceTypesToInsert: any[] = [];
          const reusedDeviceTypes: any[] = [];
          
          // Gehe durch jeden zu importierenden Gerätetyp
          for (const dt of importDeviceTypes) {
            const oldId = dt.id;
            const { id, createdAt, updatedAt, ...deviceTypeData } = dt;
            
            // Prüfe, ob bereits ein Gerätetyp mit diesem Namen existiert
            const existingDeviceType = existingDeviceTypesByName.get(dt.name);
            
            if (existingDeviceType) {
              // Wenn ein Gerätetyp mit dem Namen existiert, verwende ihn
              console.log(`Wiederverwendung vorhandener Gerätetyp: ${dt.name} (ID: ${existingDeviceType.id})`);
              
              // Füge das Mapping zwischen alter und bestehender ID hinzu
              idMappings.deviceTypes.set(oldId, existingDeviceType.id);
              
              // Füge zum Array der wiederverwendeten Gerätetypen hinzu
              reusedDeviceTypes.push({
                ...existingDeviceType,
                originalId: oldId
              });
            } else {
              // Ansonsten erstelle einen neuen Gerätetyp
              deviceTypesToInsert.push({
                ...deviceTypeData,
                originalId: oldId,
                userId: req.user?.id || 3,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          
          // Nur neue Gerätetypen einfügen, wenn welche vorhanden sind
          let insertedDeviceTypes: Array<any> = [];
          if (deviceTypesToInsert.length > 0) {
            insertedDeviceTypes = await db.insert(userDeviceTypes)
              .values(deviceTypesToInsert.map((dt: any) => {
                // originalId entfernen, da es kein Feld in der Datenbank ist
                const { originalId, ...restDt } = dt;
                return restDt;
              }))
              .returning();
            
            // Mapping zwischen alten und neuen IDs für neu eingefügte Gerätetypen erstellen
            insertedDeviceTypes.forEach((newDt, index) => {
              const oldId = deviceTypesToInsert[index].originalId;
              idMappings.deviceTypes.set(oldId, newDt.id);
              console.log(`Gerätetyp-Mapping (neu): alte ID ${oldId} -> neue ID ${newDt.id}`);
            });
          }
          
          // Statistiken aktualisieren
          stats.deviceTypes = insertedDeviceTypes.length + reusedDeviceTypes.length;
          
          // Protokollierung
          console.log(`${insertedDeviceTypes.length} neue Gerätetypen wurden erstellt.`);
          console.log(`${reusedDeviceTypes.length} vorhandene Gerätetypen wurden wiederverwendet.`);
          console.log(`Gesamtes Gerätetyp-ID-Mapping:`, Array.from(idMappings.deviceTypes.entries()));
          
          if (insertedDeviceTypes.length > 0) {
            console.log("Neu eingefügte Gerätetypen:");
            insertedDeviceTypes.forEach(dt => console.log(`ID: ${dt.id}, Name: ${dt.name}, userId: ${dt.userId}`));
          }
          
          if (reusedDeviceTypes.length > 0) {
            console.log("Wiederverwendete Gerätetypen:");
            reusedDeviceTypes.forEach(dt => console.log(`ID: ${dt.id}, Name: ${dt.name}, userId: ${dt.userId}, originalId: ${dt.originalId}`));
          }
        }
        
        // Marken importieren
        if (importBrands && importBrands.length > 0) {
          // Prüfe, ob alle benötigten Gerätetypen vorhanden sind
          const missingDeviceTypes = new Set<number>();
          for (const brand of importBrands) {
            const oldDeviceTypeId = brand.deviceTypeId;
            if (!idMappings.deviceTypes.has(oldDeviceTypeId)) {
              missingDeviceTypes.add(oldDeviceTypeId);
            }
          }
          
          // Erstelle fehlende Gerätetypen
          if (missingDeviceTypes.size > 0) {
            console.warn(`Es fehlen ${missingDeviceTypes.size} Gerätetypen, die von Marken benötigt werden.`);
            
            // Konvertieren des Sets zu einem Array für die Iteration
            for (const missingId of Array.from(missingDeviceTypes)) {
              // Erstelle einen Platzhalter-Gerätetyp
              console.log(`Erstelle fehlenden Gerätetyp mit ID ${missingId}...`);
              
              const [newDeviceType] = await db.insert(userDeviceTypes)
                .values({
                  name: `Importierter Gerätetyp ${missingId}`,
                  userId: req.user?.id || 3,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
                
              // Füge ihn zum Mapping hinzu
              if (newDeviceType) {
                idMappings.deviceTypes.set(missingId, newDeviceType.id);
                console.log(`Fehlender Gerätetyp mit alter ID ${missingId} wurde als neuer Gerätetyp mit ID ${newDeviceType.id} erstellt.`);
              }
            }
          }
          
          // Initialisiere Arrays für neue und vorhandene Marken
          const brandsToInsert: any[] = [];
          const reusedBrands: any[] = [];
          
          // Gehe durch jede zu importierende Marke
          for (const b of importBrands) {
            const oldId = b.id;
            const oldDeviceTypeId = b.deviceTypeId;
            const { id, createdAt, updatedAt, ...brandData } = b;
            
            // Neue deviceTypeId aus dem Mapping holen
            const newDeviceTypeId = idMappings.deviceTypes.get(oldDeviceTypeId);
            
            // Ausführlicheres Logging
            console.log(`Marke '${b.name}' mit ID ${oldId}:`);
            console.log(`  - Benötigt Gerätetyp mit alter ID: ${oldDeviceTypeId}`);
            console.log(`  - Im Mapping gefundene neue ID: ${newDeviceTypeId || 'KEINE'}`);
            
            if (!newDeviceTypeId) {
              console.warn(`Keine neue ID für Gerätetyp mit ID ${oldDeviceTypeId} gefunden, obwohl wir versucht haben, fehlende Gerätetypen zu erstellen.`);
              // Dies sollte eigentlich nicht mehr passieren
              continue; // Diese Marke überspringen, da wir keinen gültigen Gerätetyp haben
            }
            
            // Prüfe, ob bereits eine Marke mit diesem Namen und Gerätetyp existiert
            const key = `${b.name}-${newDeviceTypeId}`;
            const existingBrand = existingBrandsByKey.get(key);
            
            if (existingBrand) {
              // Wenn eine Marke mit dem Namen und Gerätetyp existiert, verwende sie
              console.log(`Wiederverwendung vorhandener Marke: ${b.name} für Gerätetyp ${newDeviceTypeId} (ID: ${existingBrand.id})`);
              
              // Füge das Mapping zwischen alter und bestehender ID hinzu
              idMappings.brands.set(oldId, existingBrand.id);
              
              // Füge zum Array der wiederverwendeten Marken hinzu
              reusedBrands.push({
                ...existingBrand,
                originalId: oldId
              });
            } else {
              // Ansonsten erstelle eine neue Marke
              brandsToInsert.push({
                ...brandData,
                originalId: oldId,
                deviceTypeId: newDeviceTypeId,
                userId: req.user?.id || 3,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          
          // Nur neue Marken einfügen, wenn welche vorhanden sind
          let insertedBrands: any[] = [];
          if (brandsToInsert.length > 0) {
            insertedBrands = await db.insert(userBrands)
              .values(brandsToInsert.map((b: any) => {
                // originalId entfernen, da es kein Feld in der Datenbank ist
                const { originalId, ...restB } = b;
                return restB;
              }))
              .returning();
            
            // Mapping zwischen alten und neuen IDs für neu eingefügte Marken erstellen
            insertedBrands.forEach((newB, index) => {
              const oldId = brandsToInsert[index].originalId;
              idMappings.brands.set(oldId, newB.id);
              console.log(`Marken-Mapping (neu): alte ID ${oldId} -> neue ID ${newB.id}`);
            });
          }
          
          // Statistiken aktualisieren
          stats.brands = insertedBrands.length + reusedBrands.length;
          
          // Protokollierung
          console.log(`${insertedBrands.length} neue Marken wurden erstellt.`);
          console.log(`${reusedBrands.length} vorhandene Marken wurden wiederverwendet.`);
          console.log(`Gesamtes Marken-ID-Mapping:`, Array.from(idMappings.brands.entries()));
        }
        
        // Modellreihen importieren
        if (importModelSeries && importModelSeries.length > 0) {
          // Initialisiere Arrays für neue und vorhandene Modellreihen
          const modelSeriesToInsert: any[] = [];
          const reusedModelSeries: any[] = [];
          
          // Gehe durch jede zu importierende Modellreihe
          for (const ms of importModelSeries) {
            const oldId = ms.id;
            const oldBrandId = ms.brandId;
            const { id, createdAt, updatedAt, ...msData } = ms;
            
            // Neue brandId aus dem Mapping holen
            const newBrandId = idMappings.brands.get(oldBrandId);
            
            if (!newBrandId) {
              console.warn(`Keine neue ID für Marke mit ID ${oldBrandId} gefunden. Überspringe diese Modellreihe.`);
              continue; // Diese Modellreihe überspringen, da wir keine gültige Marke haben
            }
            
            // Prüfe, ob bereits eine Modellreihe mit diesem Namen und dieser Marke existiert
            const key = `${ms.name}-${newBrandId}`;
            const existingModelSeries = existingModelSeriesByKey.get(key);
            
            if (existingModelSeries) {
              // Wenn eine Modellreihe mit dem Namen und der Marke existiert, verwende sie
              console.log(`Wiederverwendung vorhandene Modellreihe: ${ms.name} für Marke ${newBrandId} (ID: ${existingModelSeries.id})`);
              
              // Füge das Mapping zwischen alter und bestehender ID hinzu
              idMappings.modelSeries.set(oldId, existingModelSeries.id);
              
              // Füge zum Array der wiederverwendeten Modellreihen hinzu
              reusedModelSeries.push({
                ...existingModelSeries,
                originalId: oldId
              });
            } else {
              // Ansonsten erstelle eine neue Modellreihe
              modelSeriesToInsert.push({
                ...msData,
                originalId: oldId,
                brandId: newBrandId,
                userId: req.user?.id || 3,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          
          // Nur neue Modellreihen einfügen, wenn welche vorhanden sind
          let insertedModelSeries: any[] = [];
          if (modelSeriesToInsert.length > 0) {
            insertedModelSeries = await db.insert(userModelSeries)
              .values(modelSeriesToInsert.map((ms: any) => {
                // originalId entfernen, da es kein Feld in der Datenbank ist
                const { originalId, ...restMs } = ms;
                return restMs;
              }))
              .returning();
            
            // Mapping zwischen alten und neuen IDs für neu eingefügte Modellreihen erstellen
            insertedModelSeries.forEach((newMs, index) => {
              const oldId = modelSeriesToInsert[index].originalId;
              idMappings.modelSeries.set(oldId, newMs.id);
              console.log(`Modellreihen-Mapping (neu): alte ID ${oldId} -> neue ID ${newMs.id}`);
            });
          }
          
          // Statistiken aktualisieren
          stats.modelSeries = insertedModelSeries.length + reusedModelSeries.length;
          
          // Protokollierung
          console.log(`${insertedModelSeries.length} neue Modellreihen wurden erstellt.`);
          console.log(`${reusedModelSeries.length} vorhandene Modellreihen wurden wiederverwendet.`);
          console.log(`Gesamtes Modellreihen-ID-Mapping:`, Array.from(idMappings.modelSeries.entries()));
        }
        
        // Modelle importieren
        if (importModels && importModels.length > 0) {
          // Initialisiere Arrays für neue und vorhandene Modelle
          const modelsToInsert: any[] = [];
          const reusedModels: any[] = [];
          
          // Gehe durch jedes zu importierende Modell
          for (const m of importModels) {
            const oldId = m.id;
            const oldModelSeriesId = m.modelSeriesId;
            const { id, createdAt, updatedAt, ...modelData } = m;
            
            // Neue modelSeriesId aus dem Mapping holen
            const newModelSeriesId = idMappings.modelSeries.get(oldModelSeriesId);
            
            if (!newModelSeriesId) {
              console.warn(`Keine neue ID für Modellreihe mit ID ${oldModelSeriesId} gefunden. Überspringe dieses Modell.`);
              continue; // Dieses Modell überspringen, da wir keine gültige Modellreihe haben
            }
            
            // Prüfe, ob bereits ein Modell mit diesem Namen und dieser Modellreihe existiert
            const key = `${m.name}-${newModelSeriesId}`;
            const existingModel = existingModelsByKey.get(key);
            
            if (existingModel) {
              // Wenn ein Modell mit dem Namen und der Modellreihe existiert, verwende es
              console.log(`Wiederverwendung vorhandenes Modell: ${m.name} für Modellreihe ${newModelSeriesId} (ID: ${existingModel.id})`);
              
              // Es wird kein Mapping für die Modelle benötigt, da sie die unterste Ebene sind
              
              // Füge zum Array der wiederverwendeten Modelle hinzu
              reusedModels.push({
                ...existingModel,
                originalId: oldId
              });
            } else {
              // Ansonsten erstelle ein neues Modell
              modelsToInsert.push({
                ...modelData,
                modelSeriesId: newModelSeriesId,
                userId: req.user?.id || 3,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          
          // Nur neue Modelle einfügen, wenn welche vorhanden sind
          let insertedModels: any[] = [];
          if (modelsToInsert.length > 0) {
            insertedModels = await db.insert(userModels)
              .values(modelsToInsert)
              .returning();
          }
          
          // Statistiken aktualisieren
          stats.models = insertedModels.length + reusedModels.length;
          
          // Protokollierung
          console.log(`${insertedModels.length} neue Modelle wurden erstellt.`);
          console.log(`${reusedModels.length} vorhandene Modelle wurden wiederverwendet.`);
        }
      } catch (err) {
        console.error("Fehler beim Import der Daten:", err);
        throw err; // Fehler weiterwerfen, damit er im äußeren catch-Block behandelt wird
      }
      
      res.json({
        message: "Import erfolgreich abgeschlossen",
        stats: stats
      });
    } catch (error) {
      console.error("Error importing device data:", error);
      res.status(500).json({ message: "Fehler beim Importieren der Gerätedaten" });
    }
  });
  
  //==========================================================================
  // BENUTZERVERWALTUNG ROUTES
  //==========================================================================
  // Admin-Dashboard
  app.get("/api/admin/dashboard", isAdmin, async (req: Request, res: Response) => {
    try {
      // Statistiken über nicht aktivierte Benutzer und andere relevante Daten
      const allUsers = await storage.getAllUsers();
      const pendingUsers = allUsers.filter(user => !user.isActive && !user.isAdmin).length;
      const activeUsers = allUsers.filter(user => user.isActive && !user.isAdmin).length;
      const adminUsers = allUsers.filter(user => user.isAdmin).length;
      
      // Statistiken über Reparaturen
      const stats = await storage.getStats();
      
      res.json({
        users: {
          total: allUsers.length,
          pending: pendingUsers,
          active: activeUsers,
          admin: adminUsers
        },
        repairs: stats
      });
    } catch (error) {
      console.error("Error retrieving admin dashboard stats:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Administrationsdaten" });
    }
  });
  
  // Alle Benutzer abrufen
  app.get("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Entferne Passwörter aus der Antwort
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Benutzer" });
    }
  });
  
  // Einzelnen Benutzer abrufen
  app.get("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Entferne Passwort aus der Antwort
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error retrieving user:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Benutzers" });
    }
  });
  
  // Unternehmensdetails eines Benutzers abrufen
  app.get("/api/admin/users/:id/business-settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Abrufen der Business-Settings für Benutzer ${id} angefordert`);

      // Der aktuelle angemeldete Benutzer
      if (req.user) {
        console.log(`Angemeldet als: ${(req.user as any).username} (ID: ${(req.user as any).id})`);
      } else {
        console.log(`Kein Benutzer in req.user gefunden`);
      }

      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      console.log(`Benutzer gefunden: ${user.username} (ID: ${user.id})`);
      
      // Direkt aus der Datenbank abrufen, da storage.getBusinessSettings manchmal
      // nicht die korrekten Einstellungen eines anderen Benutzers zurückgibt
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, id));
        
      console.log(`Business Settings für Benutzer ${id} gefunden:`, settings ? `ID ${settings.id}` : 'keine');
      
      if (!settings) {
        // Statt 404 zurückzugeben, senden wir ein leeres Objekt mit userId
        // Dies ermöglicht der Frontend-Komponente, einen sinnvollen Fallback anzuzeigen
        return res.json({ userId: id });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error retrieving business settings:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Unternehmensdetails" });
    }
  });
  
  // Benutzer aktivieren/deaktivieren
  app.patch("/api/admin/users/:id/activate", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "Der Parameter 'isActive' muss ein boolescher Wert sein" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Verhindere, dass Administratoren deaktiviert werden können
      if (user.isAdmin && !isActive) {
        return res.status(400).json({ message: "Administratoren können nicht deaktiviert werden" });
      }
      
      const updatedUser = await storage.updateUser(id, { isActive });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
      }
      
      // Entferne Passwort aus der Antwort
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error activating/deactivating user:", error);
      res.status(500).json({ message: "Fehler beim Aktivieren/Deaktivieren des Benutzers" });
    }
  });
  
  // Benutzerdetails aktualisieren
  app.patch("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { password, isAdmin, pricingPlan, ...updateData } = req.body;
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Nur der Superadmin (bugi) darf Administratorrechte ändern
      if (isAdmin !== undefined && req.user && req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Administratorrechte ändern" });
      }
      
      // Validiere das Preispaket, falls angegeben
      if (pricingPlan !== undefined && !['basic', 'professional', 'enterprise'].includes(pricingPlan)) {
        return res.status(400).json({ message: "Ungültiges Preispaket. Erlaubte Werte sind: basic, professional, enterprise" });
      }
      
      // Aktualisiere Benutzer
      const updatedUser = await storage.updateUser(id, {
        ...updateData,
        ...(isAdmin !== undefined && { isAdmin }),
        ...(pricingPlan !== undefined && { pricingPlan }),
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
      }
      
      // Wenn ein neues Passwort angegeben wurde, aktualisiere es separat
      if (password && password.trim()) {
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(id, hashedPassword);
      }
      
      // Hole den aktualisierten Benutzer
      const freshUser = await storage.getUser(id);
      if (!freshUser) {
        return res.status(500).json({ message: "Fehler beim Abrufen der aktualisierten Benutzerdaten" });
      }
      
      // Entferne Passwort aus der Antwort
      const { password: _, ...userWithoutPassword } = freshUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Benutzerdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
    }
  });
  
  // Benutzer löschen
  app.delete("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Verhindere, dass Administratoren gelöscht werden
      if (user.isAdmin) {
        return res.status(400).json({ message: "Administratoren können nicht gelöscht werden" });
      }
      
      // Verhindere, dass der eingeloggte Benutzer sich selbst löscht
      if (req.user && user.id === req.user.id) {
        return res.status(400).json({ message: "Sie können Ihren eigenen Benutzer nicht löschen" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
    }
  });
}