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
import { addGlobalDeviceTables } from "./add-global-device-tables";

const app = express();
// Erhöhe die maximale Größe für JSON-Anfragen auf 10 MB
app.use(express.json({ limit: '10mb' }));
// Erhöhe die maximale Größe für URL-codierte Anfragen auf 10 MB
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
    await addSuperadminColumn(); // Migration für Superadmin-Rolle
    await addGlobalDeviceTables(); // Migration für globale Gerätetabellen
    
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
