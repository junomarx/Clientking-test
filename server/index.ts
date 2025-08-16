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
import { addSupportAccessTable } from "./add-support-access-table";
import { addSupportRequestStatus } from "./add-support-request-status";
import fileUpload from "express-fileupload";

// SMTP wird individuell pro Geschäft konfiguriert

const app = express();

// PWA-Dateien mit korrekten MIME-Types bedienen - VOR allen anderen Middlewares
import path from 'path';
import fs from 'fs';

app.get('/sw.js', (req, res) => {
  const swPath = path.resolve(import.meta.dirname, '..', 'public', 'sw.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const swContent = fs.readFileSync(swPath, 'utf8');
    res.send(swContent);
  } catch (error) {
    console.error('Error serving service worker:', error);
    res.status(404).send('Service Worker not found');
  }
});

app.get('/manifest.json', (req, res) => {
  const manifestPath = path.resolve(import.meta.dirname, '..', 'public', 'manifest.json');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    res.send(manifestContent);
  } catch (error) {
    console.error('Error serving manifest:', error);
    res.status(404).send('Manifest not found');
  }
});

// PWA-Icons mit korrekten MIME-Types bedienen
app.get('/icon-192.svg', (req, res) => {
  const iconPath = path.resolve(import.meta.dirname, '..', 'public', 'icon-192.svg');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  try {
    const iconContent = fs.readFileSync(iconPath, 'utf8');
    res.send(iconContent);
  } catch (error) {
    console.error('Error serving icon-192.svg:', error);
    res.status(404).send('Icon not found');
  }
});

app.get('/icon-512.svg', (req, res) => {
  const iconPath = path.resolve(import.meta.dirname, '..', 'public', 'icon-512.svg');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  try {
    const iconContent = fs.readFileSync(iconPath, 'utf8');
    res.send(iconContent);
  } catch (error) {
    console.error('Error serving icon-512.svg:', error);
    res.status(404).send('Icon not found');
  }
});

// Standard Express-Middleware
// Erhöhe die maximale Größe für JSON-Anfragen auf 50 MB (für PDF-Upload)
app.use(express.json({ limit: '50mb' }));
// Erhöhe die maximale Größe für URL-codierte Anfragen auf 50 MB
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
// Füge das File-Upload-Middleware hinzu
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximale Dateigröße
  createParentPath: true, // Erstellt fehlende Verzeichnisse automatisch
  useTempFiles: false // Benutze den Speicher für kleine Dateien
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Führe die Migrationen aus
    await addSecondSignatureColumns();
    await addPricingPlanColumn();
    await addCompanySloganVatColumns();
    await addShopIdColumn();
    await addFeatureOverridesColumn();
    await addPackageTables(); // Neue Migration für das Paketsystem
    // await addSuperadminColumn(); // Migration für Superadmin-Rolle - DEAKTIVIERT wegen User-Flag Reset
    await addDeviceIssuesFields(); // Migration für erweiterte Fehlerkatalog-Felder
    await addHiddenDeviceTypesTable(); // Migration für ausgeblendete Standard-Gerätetypen
    await addBrandIdToModels(); // Migration für brandId-Spalte in userModels
    await addPrintTemplatesTable(); // Migration für Druckvorlagen-Tabelle
    await addErrorCatalogEntriesTable(); // Migration für neue Fehlerkatalog-Tabelle
    await addGameconsoleToErrorCatalog(); // Migration für Spielekonsole-Spalte im Fehlerkatalog
    await addEmailTemplateTypeColumn(); // Migration für E-Mail-Vorlagentypen
    await addSupportAccessTable(); // Migration für Support-Zugriffsprotokolle (DSGVO-Konformität)
    await addSupportRequestStatus(); // Migration für Support-Anfrage-Status (DSGVO-Genehmigungsworkflow)
    
    // Synchronisiere E-Mail-Vorlagen beim Server-Start
    await syncEmailTemplates();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
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
