import { Request, Response } from "express";
import { Express } from "express";
import { db } from "./db";
import { users, newsletterSends } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Newsletter routes für öffentliche Abmeldung
 * Diese Routen benötigen keine Authentifizierung
 */
export function setupNewsletterRoutes(app: Express) {
  
  /**
   * Newsletter Abmeldung über E-Mail-Link
   * GET /api/newsletter/unsubscribe?token=<base64-userId>&email=<email>
   */
  app.get("/api/newsletter/unsubscribe", async (req: Request, res: Response) => {
    try {
      const { token, email } = req.query;

      if (!token || !email) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Fehler bei der Abmeldung</title>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; }
              </style>
            </head>
            <body>
              <div class="error">
                <h2>Fehler bei der Abmeldung</h2>
                <p>Ungültiger Abmelde-Link. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Token dekodieren (Base64 -> userId)
      let userId: number;
      try {
        userId = parseInt(Buffer.from(token as string, 'base64').toString());
      } catch (error) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Ungültiger Link</title>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; }
              </style>
            </head>
            <body>
              <div class="error">
                <h2>Ungültiger Abmelde-Link</h2>
                <p>Der Link ist ungültig oder beschädigt. Bitte versuchen Sie es erneut.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Benutzer suchen und E-Mail verifizieren
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.email, email as string)
          )
        );

      if (!user) {
        return res.status(404).send(`
          <html>
            <head>
              <title>Benutzer nicht gefunden</title>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; }
              </style>
            </head>
            <body>
              <div class="error">
                <h2>Benutzer nicht gefunden</h2>
                <p>Die E-Mail-Adresse konnte nicht gefunden werden. Möglicherweise wurde das Konto bereits gelöscht.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Newsletter-Abonnement deaktivieren
      await db
        .update(users)
        .set({ newsletterSubscribed: false })
        .where(eq(users.id, userId));

      // Alle zukünftigen Newsletter-Sends für diesen Benutzer als unsubscribed markieren
      await db
        .update(newsletterSends)
        .set({ 
          status: 'unsubscribed',
          unsubscribedAt: new Date()
        })
        .where(
          and(
            eq(newsletterSends.recipientId, userId),
            eq(newsletterSends.status, 'pending')
          )
        );

      console.log(`📧 Benutzer ${email} (ID: ${userId}) hat sich vom Newsletter abgemeldet`);

      // Erfolgsseite anzeigen
      res.send(`
        <html>
          <head>
            <title>Newsletter abbestellt</title>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px;
                background-color: #f9fafb;
              }
              .success { 
                color: #059669; 
                background: #ecfdf5; 
                padding: 30px; 
                border-radius: 8px; 
                border: 1px solid #d1fae5;
                text-align: center;
              }
              .logo {
                max-width: 150px;
                height: auto;
                margin-bottom: 20px;
              }
              h2 { margin-top: 0; }
              .info {
                background: #f3f4f6;
                padding: 20px;
                border-radius: 8px;
                margin-top: 20px;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="success">
              <img src="https://your-domain.com/clientking-logo.png" alt="ClientKing Logo" class="logo">
              <h2>✓ Newsletter erfolgreich abbestellt</h2>
              <p>Sie haben sich erfolgreich vom ClientKing Newsletter abgemeldet.</p>
              <p>Sie erhalten ab sofort keine weiteren Newsletter von uns.</p>
            </div>
            
            <div class="info">
              <p><strong>Hinweis:</strong> Sie können das Newsletter-Abonnement jederzeit in Ihren Account-Einstellungen wieder aktivieren.</p>
              <p>Falls Sie Fragen haben, kontaktieren Sie uns gerne.</p>
            </div>
          </body>
        </html>
      `);

    } catch (error: any) {
      console.error("Fehler bei der Newsletter-Abmeldung:", error);
      res.status(500).send(`
        <html>
          <head>
            <title>Fehler bei der Abmeldung</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Fehler bei der Abmeldung</h2>
              <p>Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  /**
   * Newsletter-Status für User abrufen (für User Details Dialog)
   */
  app.get("/api/user/newsletter-status", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }

      const [user] = await db
        .select({ newsletterSubscribed: users.newsletterSubscribed })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      res.json({ newsletterSubscribed: user.newsletterSubscribed });
    } catch (error: any) {
      console.error("Fehler beim Abrufen des Newsletter-Status:", error);
      res.status(500).json({ message: `Fehler beim Abrufen des Newsletter-Status: ${error.message}` });
    }
  });

  /**
   * Newsletter-Abonnement für User ändern (für User Details Dialog)
   */
  app.patch("/api/user/newsletter-subscription", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { newsletterSubscribed } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }

      if (typeof newsletterSubscribed !== 'boolean') {
        return res.status(400).json({ message: "newsletterSubscribed muss ein Boolean sein" });
      }

      // Benutzer abrufen und prüfen ob er Newsletter abonnieren darf (nur Owner/Multi-Shop-Admins)
      const [user] = await db
        .select({
          id: users.id,
          role: users.role,
          isMultiShopAdmin: users.isMultiShopAdmin
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Prüfen ob Benutzer berechtigt ist Newsletter zu abonnieren
      const isEligible = user.role === 'owner' || user.isMultiShopAdmin;
      
      if (!isEligible && newsletterSubscribed) {
        return res.status(403).json({ 
          message: "Nur Shop-Owner und Multi-Shop-Admins können Newsletter abonnieren" 
        });
      }

      // Newsletter-Status aktualisieren
      await db
        .update(users)
        .set({ newsletterSubscribed })
        .where(eq(users.id, userId));

      console.log(`📧 Benutzer ${userId} hat Newsletter-Abonnement ${newsletterSubscribed ? 'aktiviert' : 'deaktiviert'}`);

      res.json({ 
        message: `Newsletter-Abonnement ${newsletterSubscribed ? 'aktiviert' : 'deaktiviert'}`,
        newsletterSubscribed 
      });

    } catch (error: any) {
      console.error("Fehler beim Ändern des Newsletter-Abonnements:", error);
      res.status(500).json({ message: `Fehler beim Ändern des Newsletter-Abonnements: ${error.message}` });
    }
  });
}