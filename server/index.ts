import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import addSecondSignatureColumns from "./add-second-signature";
import { addPricingPlanColumn } from "./add-pricing-plan-column";
import { addCompanySloganVatColumns } from "./add-company-slogan-vat-columns";
import "./add-creation-month-column";
import { addShopIdColumn } from "./add-shop-id-column";
import { addFeatureOverridesColumn } from "./add-feature-overrides-column";
import { addPackageTables } from "./add-package-tables";
import { addSuperadminColumn } from "./add-superadmin";
import { addDeviceIssuesFields } from "./add-device-issues-fields";
import { addHiddenDeviceTypesTable } from "./add-hidden-device-types-table";
import { addBrandIdToModels } from "./add-brand-id-to-models";
import { addPrintTemplatesTable } from "./add-print-templates-table";
import { addErrorCatalogEntriesTable } from "./add-error-catalog-entries-table";
import { addGameconsoleToErrorCatalog } from "./add-gameconsole-to-error-catalog";
import { addEmailTemplateTypeColumn } from "./add-email-template-type";
import { syncEmailTemplates } from "./sync-email-templates";
import { setupDirectAuth } from "./direct-auth";
import { setupAuth } from "./auth";
import fileUpload from "express-fileupload";

// Setze globale SMTP-Absender-E-Mail wenn nicht vorhanden
if (!process.env.SMTP_SENDER_EMAIL) {
  process.env.SMTP_SENDER_EMAIL = "noreply@phonerepair.at";
}

// Setze globalen SMTP-Absender-Namen wenn nicht vorhanden
if (!process.env.SMTP_SENDER_NAME) {
  process.env.SMTP_SENDER_NAME = "Handyshop Verwaltung";
}

const app = express();
// Erhöhe die maximale Größe für JSON-Anfragen auf 10 MB
app.use(express.json({ limit: '10mb' }));
// Erhöhe die maximale Größe für URL-codierte Anfragen auf 10 MB
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
// Füge das File-Upload-Middleware hinzu
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximale Dateigröße
  createParentPath: true, // Erstellt fehlende Verzeichnisse automatisch
  useTempFiles: false // Benutze den Speicher für kleine Dateien
}));

// Minimales Logging - Keine überflüssige Middleware mehr
console.log("Minimales Logging aktiviert - keine Middleware wird verwendet");

(async () => {
  try {
    // Importiere die Datenbankverbindungsprüfung
    const { checkDatabaseConnection } = await import('./db');
    
    // Prüfe die Datenbankverbindung vor dem Ausführen von Migrationen
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.warn('⚠️ Datenbankverbindung konnte nicht hergestellt werden');
      console.log('🚨 Server wird mit eingeschränkter Funktionalität gestartet (Notfallmodus)');
    } else {
      console.log('✅ Datenbankverbindung erfolgreich hergestellt');
      
      try {
        // Führe die Migrationen aus
        await addSecondSignatureColumns();
        await addPricingPlanColumn();
        await addCompanySloganVatColumns();
        await addShopIdColumn();
        await addFeatureOverridesColumn();
        await addPackageTables(); // Neue Migration für das Paketsystem
        await addSuperadminColumn(); // Migration für Superadmin-Rolle
        await addDeviceIssuesFields(); // Migration für erweiterte Fehlerkatalog-Felder
        await addHiddenDeviceTypesTable(); // Migration für ausgeblendete Standard-Gerätetypen
        await addBrandIdToModels(); // Migration für brandId-Spalte in userModels
        await addPrintTemplatesTable(); // Migration für Druckvorlagen-Tabelle
        await addErrorCatalogEntriesTable(); // Migration für neue Fehlerkatalog-Tabelle
        await addGameconsoleToErrorCatalog(); // Migration für Spielekonsole-Spalte im Fehlerkatalog
        await addEmailTemplateTypeColumn(); // Migration für E-Mail-Vorlagentypen
        
        // Synchronisiere E-Mail-Vorlagen beim Server-Start
        await syncEmailTemplates();
        
        console.log('✅ Alle Migrationen erfolgreich abgeschlossen');
      } catch (migrationError) {
        console.error('❌ Fehler bei der Ausführung von Migrationen:', migrationError);
        console.log('🚨 Server wird mit eingeschränkter Funktionalität gestartet (Notfallmodus)');
      }
    }
    
    // Direkte Authentifizierungs-Endpoints einrichten (ohne Session, für Notfälle)
    console.log('🔑 Direkte Authentifizierung wird eingerichtet (für Notfälle)');
    setupDirectAuth(app);
    
    // Reguläre Authentifizierung mit Express-Session einrichten
    console.log('🔐 Reguläre Authentifizierung wird eingerichtet');
    setupAuth(app);
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Server-Fehler:', {
        status,
        message,
        stack: err.stack,
        url: _req.originalUrl,
        method: _req.method
      });

      // Fehler als JSON zurückgeben, ohne den Server zu beenden
      res.status(status).json({ 
        message,
        error: app.get('env') === 'development' ? err.stack : 'Ein Fehler ist aufgetreten' 
      });
      
      // NICHT werfen - das würde den Server abstürzen lassen
      // throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("Fehler beim Starten des Servers:", error);
    process.exit(1);
  }
})();
