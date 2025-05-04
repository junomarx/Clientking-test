/**
 * Skript zum Erstellen eines Testbenutzers für Löschtests
 */
import { db, pool } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex") + "." + salt);
    });
  });
}

async function main() {
  console.log("Erstelle Testbenutzer für Löschtests...");
  
  try {
    // Prüfe, ob der Benutzer bereits existiert
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "loeschtest@beispiel.at"));
      
    if (existingUser.length > 0) {
      console.log("Testbenutzer existiert bereits mit ID:", existingUser[0].id);
      process.exit(0);
    }
    
    // Erstelle Benutzer mit gehashtem Passwort
    const hashedPassword = await hashPassword("test1234");
    
    const [newUser] = await db
      .insert(users)
      .values({
        username: "loeschtest",
        email: "loeschtest@beispiel.at",
        password: hashedPassword,
        isAdmin: false,
        isActive: true,
        createdAt: new Date()
      })
      .returning();
      
    console.log("Testbenutzer erfolgreich erstellt mit ID:", newUser.id);
  } catch (error) {
    console.error("Fehler beim Erstellen des Testbenutzers:", error);
  } finally {
    // Schließe die Datenbankverbindung
    await pool.end();
  }
}

main();
