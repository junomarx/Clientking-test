/**
 * Migration: Hinzufügen der is_superadmin-Spalte zur users-Tabelle
 * und Erstellen des ersten Superadmin-Benutzers
 */

import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Überprüft, ob die Spalte is_superadmin bereits existiert
async function columnExists(columnName: string, tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND column_name = ${columnName}
    )
  `);
  return result.rows[0].exists;
}

// Funktion zum Abrufen eines Benutzers nach Benutzernamen
async function getUserByUsername(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return user;
}

// Entferne Admin-Rechte von bugi
async function removeBugiAdminRights() {
  console.log("Entferne Admin-Rechte von bugi...");
  const bugi = await getUserByUsername("bugi");
  if (bugi) {
    await db
      .update(users)
      .set({ isAdmin: false, isSuperadmin: false })
      .where(eq(users.id, bugi.id));
    console.log(`Admin-Rechte wurden von bugi (ID=${bugi.id}) entfernt.`);
  } else {
    console.log("Benutzer bugi nicht gefunden.");
  }
}

// Erstelle den Superadmin-Benutzer oder aktualisiere ihn, falls er bereits existiert
async function createSuperadmin() {
  const superadminUsername = "macnphone";
  const superadminEmail = "macnphone@example.com";
  const superadminPassword = "supersecure123";
  
  // Prüfen, ob der Benutzer bereits existiert
  const existingUser = await getUserByUsername(superadminUsername);
  
  if (existingUser) {
    console.log(`Benutzer ${superadminUsername} existiert bereits, aktualisiere ihn...`);
    // Benutzer existiert bereits - aktualisiere ihn zum Superadmin
    await db
      .update(users)
      .set({
        isActive: true,
        isAdmin: false,
        isSuperadmin: true,
        // Shop-ID auf NULL setzen
        shopId: null,
      })
      .where(eq(users.id, existingUser.id));
    console.log(`Benutzer ${superadminUsername} wurde zum Superadmin aktualisiert.`);
  } else {
    console.log(`Erstelle neuen Superadmin-Benutzer ${superadminUsername}...`);
    // Hash das Passwort
    const hashedPassword = await hashPassword(superadminPassword);
    
    // Erstelle den neuen Benutzer
    const [newUser] = await db
      .insert(users)
      .values({
        username: superadminUsername,
        email: superadminEmail,
        password: hashedPassword,
        isActive: true,
        isAdmin: false,
        isSuperadmin: true,
        // Shop-ID auf NULL setzen
        shopId: null,
      })
      .returning();
    
    console.log(`Superadmin-Benutzer ${superadminUsername} wurde erstellt mit ID ${newUser.id}.`);
  }
}

export async function addSuperadminColumn() {
  console.log("Starte Migration: Hinzufügen der Superadmin-Spalte...");
  
  // Prüfen, ob die Spalte bereits existiert
  const columnAlreadyExists = await columnExists("is_superadmin", "users");
  
  if (columnAlreadyExists) {
    console.log("Die is_superadmin-Spalte existiert bereits.");
  } else {
    console.log("Füge is_superadmin-Spalte zur users-Tabelle hinzu...");
    // Spalte hinzufügen
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log("is_superadmin-Spalte wurde erfolgreich hinzugefügt.");
  }
  
  // Entferne Admin-Rechte von bugi
  await removeBugiAdminRights();
  
  // Erstelle den Superadmin-Benutzer
  await createSuperadmin();
  
  console.log("Superadmin-Migration abgeschlossen.");
  return true;
}
