/**
 * Migrations-Skript zum Hinzufügen der trialExpiresAt-Spalte zur Benutzertabelle
 * und zum Erstellen des Demo-Pakets
 */
import { db, pool } from "./db";
import { packages, packageFeatures } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function addTrialExpiresAtColumn() {
  try {
    console.log("Migration: Hinzufügen der trial_expires_at-Spalte zur users-Tabelle...");
    
    // SQL-Skript ausführen
    const sqlPath = path.join(process.cwd(), "add-trial-column.sql");
    const sqlScript = fs.readFileSync(sqlPath, "utf8");
    
    await pool.query(sqlScript);
    
    console.log("Migration für trial_expires_at-Spalte erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler beim Hinzufügen der trial_expires_at-Spalte:", error);
    throw error;
  }
}

async function createDemoPackage() {
  try {
    console.log("Erstelle Demo-Paket, falls es noch nicht existiert...");
    
    // Prüfen, ob Demo-Paket bereits existiert
    const existingPackage = await db
      .select()
      .from(packages)
      .where(eq(packages.name, "Demo"))
      .execute();
    
    if (existingPackage.length > 0) {
      console.log("Demo-Paket existiert bereits.");
      return;
    }
    
    // Demo-Paket erstellen
    const [demoPackage] = await db
      .insert(packages)
      .values({
        name: "Demo",
        monthlyPrice: 0,
        annualPrice: 0,
        description: "Kostenlose 14-tägige Testversion mit eingeschränkten Funktionen",
        maxRepairs: 10,
        maxCustomers: 20,
        isHidden: false,
        isForNewUsers: true,
        priority: 0
      })
      .returning();
      
    console.log(`Demo-Paket erstellt mit ID: ${demoPackage.id}`);
    
    // Features für Demo-Paket hinzufügen
    const demoFeatures = [
      { name: "repair_management", displayName: "Reparaturverwaltung", isEnabled: true },
      { name: "customer_management", displayName: "Kundenverwaltung", isEnabled: true },
      { name: "email_notifications", displayName: "E-Mail-Benachrichtigungen", isEnabled: false },
      { name: "device_management", displayName: "Geräteverwaltung", isEnabled: true },
      { name: "dashboard", displayName: "Dashboard", isEnabled: true },
      { name: "email_templates", displayName: "E-Mail-Vorlagen", isEnabled: false },
      { name: "cost_estimates", displayName: "Kostenvoranschläge", isEnabled: true },
      { name: "reporting", displayName: "Berichterstattung", isEnabled: false },
      { name: "digital_signatures", displayName: "Digitale Signaturen", isEnabled: true },
      { name: "printable_receipts", displayName: "Druckbare Quittungen", isEnabled: true },
      { name: "custom_branding", displayName: "Eigenes Branding", isEnabled: false },
      { name: "advanced_search", displayName: "Erweiterte Suche", isEnabled: false }
    ];
    
    // Features in die Datenbank einfügen
    for (const feature of demoFeatures) {
      await db
        .insert(packageFeatures)
        .values({
          packageId: demoPackage.id,
          featureName: feature.name,
          displayName: feature.displayName,
          isEnabled: feature.isEnabled
        });
    }
    
    console.log(`${demoFeatures.length} Features für das Demo-Paket hinzugefügt.`);
  } catch (error) {
    console.error("Fehler beim Erstellen des Demo-Pakets:", error);
    throw error;
  }
}

async function main() {
  try {
    await addTrialExpiresAtColumn();
    await createDemoPackage();
    
    console.log("Demo-Paket-Migration erfolgreich abgeschlossen.");
    process.exit(0);
  } catch (error) {
    console.error("Fehler bei der Demo-Paket-Migration:", error);
    process.exit(1);
  }
}

main();