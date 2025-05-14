import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupDirectAuth } from "./direct-auth";
import fileUpload from "express-fileupload";
import { setupVite, serveStatic, log } from "./vite";

// Für bessere Fehlermeldungen
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Setze globale SMTP-Absender-E-Mail wenn nicht vorhanden
if (!process.env.SMTP_SENDER_EMAIL) {
  process.env.SMTP_SENDER_EMAIL = "noreply@phonerepair.at";
}

// Setze globalen SMTP-Absender-Namen wenn nicht vorhanden
if (!process.env.SMTP_SENDER_NAME) {
  process.env.SMTP_SENDER_NAME = "Handyshop Verwaltung";
}

const app = express();

// Grundlegende Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  createParentPath: true,
  useTempFiles: false
}));

// Einfache Logging-Middleware ohne komplexe Funktionalität
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

async function startServer() {
  try {
    // Nur Direct-Auth ohne irgendwelche Migrationen
    setupDirectAuth(app);
    
    // Routen registrieren
    const server = await registerRoutes(app);
    
    // Fehlerbehandlung
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server-Fehler:", err);
      res.status(500).json({
        error: "Interner Serverfehler",
        message: err.message || "Ein unbekannter Fehler ist aufgetreten"
      });
    });
    
    // Setup Vite nach der Fehlerbehandlung
    // Nur für Produktion erforderlich
    if (process.env.NODE_ENV !== "development") {
      await setupVite(app);
    }
    
    // Statische Dateien bereitstellen - nur für Produktion
    // Im Entwicklungsmodus ist das nicht nötig, da Vite den Client bereitstellt
    if (process.env.NODE_ENV === "production") {
      await serveStatic(app);
    }
    
    // Notfall-Login-Seite bereitstellen
    app.get('/emergency', (req, res) => {
      res.sendFile('/home/runner/workspace/emergency-login.html');
    });
    
    // Server starten
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`[express] serving on port ${PORT}`);
    });
    
  } catch (error) {
    console.error("Kritischer Fehler beim Serverstart:", error);
    process.exit(1);
  }
}

// Server starten
startServer();