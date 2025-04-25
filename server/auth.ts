import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Stellen Sie sicher, dass das SECRET im Produktion gesetzt ist
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.warn('Warning: SESSION_SECRET is not set in production environment');
  }

  // Session-Konfiguration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sehr-sicherer-handyshop-session-key-1234567890",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    name: 'handyshop.sid', // Anpassung des Cookie-Namens
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 Woche
      sameSite: 'lax',
      httpOnly: true,
      secure: false, // In Entwicklung immer false, da kein HTTPS
      path: '/'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Ungültiger Benutzername oder Passwort' });
        } 
        // Überprüfe, ob der Benutzer aktiv ist (es sei denn, es ist ein Admin)
        else if (!user.isActive && !user.isAdmin) {
          return done(null, false, { message: 'Konto ist nicht aktiviert. Bitte warten Sie auf die Freischaltung durch einen Administrator.' });
        } 
        else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Überprüfe die erforderlichen Felder
      const { username, password, email, companyName } = req.body;
      
      if (!username || !password || !email || !companyName) {
        return res.status(400).json({ 
          message: "Bitte füllen Sie alle erforderlichen Felder aus (Benutzername, Passwort, E-Mail, Firmenname)" 
        });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Benutzername existiert bereits" });
      }
      
      // Überprüfe, ob die E-Mail bereits verwendet wird
      const usersWithEmail = await storage.getUsersByEmail(email);
      if (usersWithEmail && usersWithEmail.length > 0) {
        return res.status(400).json({ message: "Diese E-Mail-Adresse wird bereits verwendet" });
      }

      // Erstelle einen neuen Benutzer (standardmäßig inaktiv)
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(password),
        isActive: false,  // Benutzer müssen vom Admin aktiviert werden
        isAdmin: false    // Standardmäßig kein Administrator
      });

      // Sende einen Erfolg zurück, aber logge den Benutzer nicht ein
      // Der Benutzer muss erst vom Administrator freigeschaltet werden
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ 
        ...userWithoutPassword, 
        message: "Registrierung erfolgreich. Ihr Konto muss vom Administrator freigeschaltet werden, bevor Sie sich anmelden können." 
      });
    } catch (error) {
      console.error("Fehler bei der Registrierung:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        // Verwende die Fehlermeldung aus info, wenn vorhanden
        const errorMessage = info && info.message ? info.message : "Benutzername oder Passwort falsch";
        return res.status(401).json({ message: errorMessage });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Generate a simple token (in production we would use JWT)
        const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
        
        // Return the user without the password and token
        const { password, ...userWithoutPassword } = user;
        res.status(200).json({ 
          ...userWithoutPassword, 
          token 
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Return the user without the password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}