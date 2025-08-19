import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// Hilfsfunktion zur Prüfung, ob ein Benutzer Superadmin ist
export function isSuperadmin(user: Express.User | null | undefined): boolean {
  return Boolean(user && user.isSuperadmin === true);
}

declare global {
  namespace Express {
    // Making sure the User interface extends SelectUser 
    // and explicitly includes the password field
    interface User extends SelectUser {
      password: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
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

  // Session-Konfiguration - unterschiedlich für Entwicklung und Produktion
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sehr-sicherer-handyshop-session-key-1234567890",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: isProduction ? 'handyshop.sid' : 'connect.sid', // Standard Cookie-Name in Entwicklung
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 Woche
      sameSite: 'lax',
      httpOnly: true,
      secure: isProduction, // Nur in Produktion HTTPS verwenden
      path: '/'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (emailOrUsername, password, done) => {
      try {
        let user = null;
        
        // Strikte Regeln: 
        // - Enthält "@" = Mitarbeiter (role='employee') oder Kiosk (role='kiosk') über E-Mail
        // - Kein "@" = Shop-Owner (role='owner' oder null/undefined) über Benutzername
        if (emailOrUsername.includes('@')) {
          // E-Mail-basierte Anmeldung für Mitarbeiter und Kiosk-Mitarbeiter
          user = await storage.getUserByEmail(emailOrUsername);
          
          // Zusätzliche Validierung: Nur Mitarbeiter und Kiosk-Mitarbeiter dürfen sich per E-Mail anmelden
          if (user && user.role !== 'employee' && user.role !== 'kiosk') {
            console.log(`❌ Login-Verstoß: Benutzer ${user.username} (role: ${user.role}) versuchte E-Mail-Login`);
            return done(null, false, { message: 'E-Mail-Anmeldung nur für Mitarbeiter möglich' });
          }
        } else {
          // Benutzername-basierte Anmeldung nur für Shop-Owner
          user = await storage.getUserByUsername(emailOrUsername);
          
          // Zusätzliche Validierung: Nur Shop-Owner dürfen sich per Benutzername anmelden
          if (user && (user.role === 'employee' || user.role === 'kiosk')) {
            console.log(`❌ Login-Verstoß: ${user.role === 'kiosk' ? 'Kiosk-Mitarbeiter' : 'Mitarbeiter'} ${user.username} versuchte Benutzername-Login`);
            return done(null, false, { message: 'Mitarbeiter und Kiosk-Mitarbeiter müssen sich mit ihrer E-Mail-Adresse anmelden' });
          }
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Ungültige Anmeldedaten' });
        }
        
        // Überprüfe, ob der Benutzer aktiv ist (es sei denn, es ist ein Superadmin)
        if (!user.isActive && !user.isSuperadmin) {
          return done(null, false, { message: 'Konto ist nicht aktiviert. Bitte warten Sie auf die Freischaltung durch einen Superadministrator.' });
        }
        
        console.log(`✅ Login erfolgreich: ${user.username} (role: ${user.role || 'owner'}) via ${emailOrUsername.includes('@') ? 'E-Mail' : 'Benutzername'}`);
        
        // Aktualisiere den letzten Login-Zeitpunkt
        if (storage.updateUserLastLogin) {
          await storage.updateUserLastLogin(user.id);
        }
        return done(null, user);
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
      console.log("📨 Registrierungsanfrage erhalten:", JSON.stringify(req.body, null, 2));
      
      // Vereinfachte Registrierungsfelder extrahieren
      const { 
        // Persönliche Daten
        ownerFirstName,
        ownerLastName,
        
        // Adressdaten
        streetAddress,
        zipCode,
        city,
        country,
        
        // Firmen- und Kontaktdaten
        companyName,
        website,
        companyPhone,
        email,
        taxId,
        
        // Login-Daten
        username,
        password
      } = req.body;
      
      console.log("🔍 Extrahierte Felder:", {
        ownerFirstName, ownerLastName, streetAddress, zipCode, city, country,
        companyName, website, companyPhone, email, taxId, username, 
        passwordPresent: !!password
      });
      
      console.log("🎯 Alle Felder vollständig:", {
        allFieldsPresent: !!(ownerFirstName && ownerLastName && streetAddress && zipCode && city && country && companyName && companyPhone && email && taxId && username && password)
      });
      
      // Überprüfe erforderliche Felder
      if (!ownerFirstName || !ownerLastName || !streetAddress || !zipCode || !city || !country) {
        console.log("❌ Adressdaten-Validierung fehlgeschlagen:", {
          ownerFirstName: !!ownerFirstName,
          ownerLastName: !!ownerLastName,
          streetAddress: !!streetAddress,
          zipCode: !!zipCode,
          city: !!city,
          country: !!country
        });
        return res.status(400).json({ 
          message: "Bitte füllen Sie alle Adressdaten aus (Name, Straße, PLZ, Ort, Land)" 
        });
      }
      
      if (!companyName || !companyPhone || !email || !taxId || !username || !password) {
        return res.status(400).json({ 
          message: "Bitte füllen Sie alle erforderlichen Felder aus (Firma, Telefon, E-Mail, UID, Benutzername, Passwort)" 
        });
      }
      
      // Vollständige Adresse zusammenstellen
      const companyAddress = `${streetAddress}, ${zipCode} ${city}, ${country}`;
      
      // Prüfe nur auf Shop-Owner mit dem gleichen Benutzernamen
      // Mitarbeiter-Benutzernamen sind erlaubt, da sie sich per E-Mail anmelden
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && (!existingUser.role || existingUser.role === 'owner')) {
        console.log(`❌ Shop-Owner-Benutzername "${username}" bereits vergeben`);
        return res.status(400).json({ message: "Benutzername bereits vergeben" });
      }
      
      // Wenn ein Mitarbeiter mit dem Namen existiert, das ist OK für Shop-Owner
      if (existingUser && existingUser.role === 'employee') {
        console.log(`ℹ️ Mitarbeiter "${username}" existiert, aber Shop-Owner darf gleichen Namen verwenden`);
      }
      
      // Überprüfe, ob die E-Mail bereits verwendet wird
      const usersWithEmail = await storage.getUsersByEmail(email);
      if (usersWithEmail && usersWithEmail.length > 0) {
        return res.status(400).json({ message: "Diese E-Mail-Adresse wird bereits verwendet" });
      }
      
      console.log(`Neuer Benutzer ${username} erhält Basic-Paket ohne Einschränkungen`);

      // Erstelle einen neuen Benutzer mit ALLEN Registrierungsdaten auf einmal
      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        email,
        companyName,
        companyAddress,
        companyPhone,
        companyEmail: email,
        companyVatNumber: taxId || "",
        ownerFirstName,
        ownerLastName,
        streetAddress,
        zipCode,
        city,
        country: country || "Österreich",
        taxId: taxId || "",
        website: website || ""
      });

      console.log(`✅ Benutzer ${username} mit allen Geschäftsdaten erfolgreich erstellt (inaktiv, wartet auf Aktivierung)`);
      console.log(`📋 Gespeicherte Daten: ${companyName}, ${ownerFirstName} ${ownerLastName}, ${streetAddress}, ${zipCode} ${city}`);

      // Benachrichtige alle Superadmins über die neue Registrierung, damit sie den Benutzer freischalten können
      try {
        // Suche alle Superadmin-Benutzer
        const superadmins = await storage.getSuperadmins();
        if (superadmins && superadmins.length > 0) {
          console.log(`Sende Benachrichtigung an ${superadmins.length} Superadmins über neue Benutzerregistrierung: ${username}`);
          
          // Finde die "Neue Registrierung" E-Mail-Vorlage für Superadmins
          const emailTemplateId = await storage.findSystemEmailTemplateIdByName("Neue Benutzerregistrierung");
          
          if (emailTemplateId) {
            // Erstelle Variablen für die E-Mail-Vorlage
            const variables = {
              username,
              email,
              companyName,
              registrationDate: new Date().toLocaleString('de-DE'),
              activationLink: `${process.env.FRONTEND_URL || 'https://example.com'}/superadmin/users`
            };
            
            // Sende E-Mail an jeden Superadmin
            for (const admin of superadmins) {
              if (admin.email) {
                try {
                  await storage.sendEmailWithTemplateById(emailTemplateId, admin.email, variables, [], true);
                  console.log(`✅ Benachrichtigungs-E-Mail an Superadmin ${admin.username} (${admin.email}) gesendet`);
                } catch (emailError) {
                  console.error(`❌ Fehler beim Senden der Benachrichtigungs-E-Mail an Superadmin ${admin.username}:`, emailError);
                }
              }
            }
          } else {
            console.warn("Keine E-Mail-Vorlage für 'Neue Benutzerregistrierung' gefunden");
          }
        } else {
          console.warn("Keine Superadmin-Benutzer gefunden für Benachrichtigung über neue Registrierung");
        }
      } catch (notificationError) {
        console.error("Fehler beim Benachrichtigen der Superadmins über neue Registrierung:", notificationError);
        // Ignoriere Fehler beim Benachrichtigen, damit die Registrierung trotzdem funktioniert
      }
      
      // Sende einen Erfolg zurück, aber logge den Benutzer nicht ein
      // Der Benutzer muss erst vom Superadmin freigeschaltet werden
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ 
        ...userWithoutPassword, 
        message: "Registrierung erfolgreich. Ihr Konto muss vom Superadministrator freigeschaltet werden, bevor Sie sich anmelden können." 
      });
    } catch (error) {
      console.error("Fehler bei der Registrierung:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        // Verwende die Fehlermeldung aus info, wenn vorhanden
        const errorMessage = info && info.message ? info.message : "Benutzername oder Passwort falsch";
        return res.status(401).json({ message: errorMessage });
      }
      
      // DSGVO-Schutz: Prüfe, ob der Benutzer eine Shop-Zuordnung hat (außer bei Superadmins)
      // Multi-Shop Admins werden anhand der multi_shop_access Tabelle identifiziert
      const accessibleShopsCount = await storage.getUserAccessibleShopsCount(user.id);
      const hasMultiShopAccess = accessibleShopsCount > 0;
      const isMultiShopAdmin = !user.shopId && !user.isSuperadmin && hasMultiShopAccess;
      
      console.log(`🔍 Login-Prüfung für ${user.username}: shopId=${user.shopId}, isAdmin=${user.isAdmin}, isSuperadmin=${user.isSuperadmin}, accessibleShopsCount=${accessibleShopsCount}, isMultiShopAdmin=${isMultiShopAdmin}`);
      
      if (!user.shopId && !user.isSuperadmin && !isMultiShopAdmin) {
        console.error(`❌ Login verweigert: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung`);
        return res.status(403).json({ 
          message: "Ihr Benutzerkonto ist nicht korrekt konfiguriert. Bitte kontaktieren Sie den Administrator." 
        });
      }
      
      if (isMultiShopAdmin) {
        console.log(`✅ Multi-Shop Admin erkannt: ${user.username} (ID: ${user.id})`);
      }
      
      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Update last login timestamp
        try {
          await storage.updateUserLastLogin(user.id);
        } catch (error) {
          console.error("Failed to update last login timestamp:", error);
        }
        
        // Generate a simple token (in production we would use JWT)
        const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
        
        console.log(`✅ Login erfolgreich für Benutzer ${user.username} (ID: ${user.id}, Shop-ID: ${user.shopId})`);
        
        // Return the user without the password and token
        const { password, ...userWithoutPassword } = user;
        res.status(200).json({ 
          ...userWithoutPassword, 
          token 
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    const userId = req.user?.id;
    
    req.logout(async (err) => {
      if (err) return next(err);
      
      // Update last logout timestamp if user was logged in
      if (userId) {
        try {
          await storage.updateUserLastLogout(userId);
        } catch (error) {
          console.error("Failed to update last logout timestamp:", error);
        }
      }
      
      // Zerstöre die Session vollständig
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
          return next(destroyErr);
        }
        
        // Lösche den Session-Cookie basierend auf der Umgebung
        const cookieName = isProduction ? 'handyshop.sid' : 'connect.sid';
        res.clearCookie(cookieName, { 
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: isProduction
        });
        
        // Zusätzlich in Entwicklung auch handyshop.sid löschen falls vorhanden
        if (!isProduction) {
          res.clearCookie('handyshop.sid', { 
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: false
          });
        }
        
        console.log(`✅ Benutzer ${userId} erfolgreich abgemeldet (${cookieName})`);
        res.sendStatus(200);
      });
    });
  });

  // Middleware zum Überprüfen von Token im Authorization-Header
  const checkTokenAuth = async (req: any, res: any, next: any) => {
    // Prüfe zuerst Session-Authentifizierung
    if (req.isAuthenticated()) {
      return next();
    }
    
    // Dann prüfe Token-Authentifizierung
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const tokenData = Buffer.from(token, 'base64').toString().split(':');
        
        if (tokenData.length >= 2) {
          const userId = parseInt(tokenData[0]);
          const user = await storage.getUser(userId);
          
          if (user && (user.isActive || user.isSuperadmin)) {
            // DSGVO-Schutz: Prüfe Shop-Zuordnung
            if (user.shopId || user.isSuperadmin) {
              req.user = user;
              return next();
            }
          }
        }
      } catch (error) {
        console.error("Token authentication error:", error);
      }
    }
    
    // Keine gültige Authentifizierung gefunden
    return res.status(401).json({ message: "Nicht angemeldet" });
  };
  
  app.get("/api/user", checkTokenAuth, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
    
    // Aktualisiere die letzte Aktivität des Benutzers
    try {
      storage.updateUserLastActivity(req.user.id);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der letzten Aktivität:", error);
    }
    
    // Return the user without the password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Route für Benutzer, um ihr Passwort zu ändern (wenn sie angemeldet sind)
  app.post("/api/change-password", checkTokenAuth, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Aktuelles Passwort und neues Passwort erforderlich" });
    }
    
    // Überprüfe das aktuelle Passwort
    const passwordValid = await comparePasswords(currentPassword, req.user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Aktuelles Passwort ist falsch" });
    }
    
    // Hash des neuen Passworts erstellen
    const hashedPassword = await hashPassword(newPassword);
    
    // Passwort aktualisieren
    const success = await storage.updateUserPassword(req.user.id, hashedPassword);
    
    if (success) {
      res.status(200).json({ message: "Passwort erfolgreich geändert" });
    } else {
      res.status(500).json({ message: "Fehler beim Ändern des Passworts" });
    }
  });
  
  // Route für Benutzer, um ihr Profil zu aktualisieren (wenn sie angemeldet sind)
  app.patch("/api/user/profile", checkTokenAuth, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
    
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ message: "Benutzername und E-Mail-Adresse erforderlich" });
    }
    
    // Prüfen, ob der Benutzername bereits existiert (außer für den aktuellen Benutzer)
    if (username !== req.user.username) {
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: "Dieser Benutzername wird bereits verwendet" });
      }
    }
    
    // Prüfen, ob die E-Mail-Adresse bereits existiert (außer für den aktuellen Benutzer)
    if (email !== req.user.email) {
      const usersWithEmail = await storage.getUsersByEmail(email);
      if (usersWithEmail.some(u => u.id !== req.user!.id)) {
        return res.status(400).json({ message: "Diese E-Mail-Adresse wird bereits verwendet" });
      }
    }
    
    // Benutzerprofil aktualisieren
    const updatedUser = await storage.updateUser(req.user.id, { username, email });
    
    if (updatedUser) {
      // Gib den aktualisierten Benutzer ohne das Passwort zurück
      const { password, resetToken, resetTokenExpires, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } else {
      res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzerprofils" });
    }
  });
  
  // Route zum Anfordern einer Passwort-Zurücksetzung
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "E-Mail-Adresse erforderlich" });
    }
    
    // Suche nach einem Benutzer mit der angegebenen E-Mail-Adresse
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Aus Sicherheitsgründen geben wir dieselbe Nachricht zurück, auch wenn der Benutzer nicht existiert
      return res.status(200).json({
        message: "Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde eine Anleitung zum Zurücksetzen des Passworts gesendet."
      });
    }
    
    // Generiere einen zufälligen Token
    const token = randomBytes(32).toString('hex');
    const expiryTime = new Date(Date.now() + 3600000); // Token ist 1 Stunde gültig
    
    // Speichere den Token in der Datenbank
    const success = await storage.setPasswordResetToken(email, token, expiryTime);
    
    if (!success) {
      return res.status(500).json({ message: "Fehler beim Erstellen des Zurücksetzungstokens" });
    }
    
    // Sende eine E-Mail mit dem Reset-Link
    try {
      // Hole die Geschäftseinstellungen für diese E-Mail
      const businessSettings = await storage.getBusinessSettings(user.id);
      
      if (!businessSettings) {
        return res.status(500).json({ message: "Geschäftseinstellungen nicht gefunden" });
      }
      
      // Erstelle den Reset-Link, den wir in der E-Mail senden
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
      
      // Variablen für die E-Mail-Vorlage
      const variables = {
        username: user.username,
        companyName: businessSettings.businessName,
        resetLink: resetUrl,
        validUntil: expiryTime.toLocaleString('de-DE')
      };
      
      // Hole die E-Mail-Vorlagen-ID für die Passwort-Zurücksetzung
      // Normalerweise würden wir eine spezielle Vorlage verwenden, aber für dieses Beispiel senden wir direkt
      // In einer produktiven Umgebung sollte eine spezielle Vorlage erstellt werden
      
      const emailHtml = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { 
                display: inline-block; 
                background-color: #4a6ee0; 
                color: white !important; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold;
                margin: 20px 0;
              }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Passwort zurücksetzen für ${businessSettings.businessName}</h2>
              <p>Hallo ${user.username},</p>
              <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Bitte klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
              
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
                  </td>
                </tr>
              </table>
              
              <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              
              <p>Dieser Link ist bis ${variables.validUntil} gültig.</p>
              
              <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren und Ihr Passwort bleibt unverändert.</p>
              
              <div class="footer">
                <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese Nachricht.</p>
                <p>&copy; ${new Date().getFullYear()} ${businessSettings.businessName}</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // Jetzt senden wir die E-Mail
      const sent = await sendPasswordResetEmail(
        user.email, 
        `Zurücksetzen Ihres Passworts für ${businessSettings.businessName}`,
        emailHtml,
        user.id
      );
      
      if (sent) {
        res.status(200).json({
          message: "Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde eine Anleitung zum Zurücksetzen des Passworts gesendet."
        });
      } else {
        res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
      }
    } catch (error) {
      console.error("Fehler beim Senden der Passwort-Zurücksetzungs-E-Mail:", error);
      res.status(500).json({ message: "Fehler beim Senden der E-Mail" });
    }
  });
  
  // Route zum Validieren eines Tokens und Zurücksetzen des Passworts
  app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token und neues Passwort sind erforderlich" });
    }
    
    // Überprüfe, ob der Token gültig ist und finde den zugehörigen Benutzer
    const user = await storage.getUserByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ message: "Ungültiger oder abgelaufener Token" });
    }
    
    // Hash des neuen Passworts erstellen
    const hashedPassword = await hashPassword(newPassword);
    
    // Aktualisiere das Passwort und lösche den Token
    const success = await storage.updateUserPassword(user.id, hashedPassword);
    
    if (!success) {
      return res.status(500).json({ message: "Fehler beim Aktualisieren des Passworts" });
    }
    
    // Token löschen
    await storage.clearResetToken(user.id);
    
    res.status(200).json({ message: "Passwort erfolgreich zurückgesetzt" });
  });
}

// Hilfsfunktion zum Senden einer Passwort-Zurücksetzungs-E-Mail
async function sendPasswordResetEmail(to: string, subject: string, html: string, userId: number): Promise<boolean> {
  try {
    // Verwende die globalen SMTP-Einstellungen aus den Umgebungsvariablen für systemrelevante E-Mails
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpSenderName = process.env.SMTP_SENDER_NAME || "Handyshop Verwaltung";
    const smtpSenderEmail = process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER;
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      console.error("Globale SMTP-Einstellungen fehlen - Passwort-Zurücksetzungs-E-Mail kann nicht gesendet werden");
      return false;
    }
    
    console.log("[E-Mail-Debug] Verwende globale SMTP-Konfiguration für systemrelevante E-Mail:", {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      user: smtpUser,
      senderName: smtpSenderName,
      senderEmail: smtpSenderEmail
    });
    
    // Erstelle einen SMTP-Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
    
    console.log("[E-Mail-Debug] Sende Passwort-Zurücksetzungs-E-Mail an:", to);
    
    // Sende die E-Mail
    const info = await transporter.sendMail({
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to,
      subject,
      html
    });
    
    console.log("[E-Mail-Debug] Passwort-Zurücksetzungs-E-Mail gesendet:", info.messageId);
    console.log("[E-Mail-Debug] Weitere Info:", info.response);
    return true;
  } catch (error) {
    console.error("[E-Mail-Debug] Fehler beim Senden der Passwort-Zurücksetzungs-E-Mail:", error);
    return false;
  }
}