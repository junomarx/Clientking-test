/**
 * Dieses Skript fügt die nötigen Tabellen für das neue Paketsystem hinzu:
 * - packages: Definition der verfügbaren Pakete
 * - package_features: Zuordnung von Features zu Paketen
 * - Hinzufügen der package_id-Spalte zur users-Tabelle
 */

import { db } from "./db";
import { packages, packageFeatures, users } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function addPackageTables() {
  console.log("Migration: Hinzufügen der Tabellen für das Paketsystem...");

  try {
    // 1. Prüfen, ob die packages-Tabelle existiert
    const packagesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'packages'
      );
    `);

    if (!packagesExists.rows[0].exists) {
      console.log("Erstelle packages-Tabelle...");
      await db.execute(sql`
        CREATE TABLE "packages" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "description" TEXT,
          "price_monthly" DOUBLE PRECISION NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      console.log("packages-Tabelle erfolgreich erstellt.");
    } else {
      console.log("Die packages-Tabelle existiert bereits.");
    }

    // 2. Prüfen, ob die package_features-Tabelle existiert
    const packageFeaturesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'package_features'
      );
    `);

    if (!packageFeaturesExists.rows[0].exists) {
      console.log("Erstelle package_features-Tabelle...");
      await db.execute(sql`
        CREATE TABLE "package_features" (
          "package_id" INTEGER NOT NULL REFERENCES "packages"("id"),
          "feature" TEXT NOT NULL,
          PRIMARY KEY ("package_id", "feature")
        );
      `);
      console.log("package_features-Tabelle erfolgreich erstellt.");
    } else {
      console.log("Die package_features-Tabelle existiert bereits.");
    }

    // 3. Prüfen und hinzufügen der package_id-Spalte zur users-Tabelle
    const packageIdExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'package_id'
      );
    `);

    if (!packageIdExists.rows[0].exists) {
      console.log("Füge package_id-Spalte zur users-Tabelle hinzu...");
      await db.execute(sql`
        ALTER TABLE "users"
        ADD COLUMN "package_id" INTEGER REFERENCES "packages"("id");
      `);
      console.log("package_id-Spalte erfolgreich hinzugefügt.");
    } else {
      console.log("Die package_id-Spalte existiert bereits in der users-Tabelle.");
    }

    // 4. Erstelle Standardpakete, wenn die Tabelle gerade erstellt wurde
    if (!packagesExists.rows[0].exists) {
      console.log("Erstelle Standardpakete...");
      
      // Basic-Paket
      const basicPackage = await db.execute(sql`
        INSERT INTO "packages" ("name", "description", "price_monthly")
        VALUES ('Basic', 'Grundlegende Funktionen für kleine Handyshops', 29.90)
        RETURNING "id";
      `);
      const basicPackageId = basicPackage.rows[0].id;
      
      // Basic-Features
      await db.execute(sql`
        INSERT INTO "package_features" ("package_id", "feature")
        VALUES 
          (${basicPackageId}, 'dashboard'),
          (${basicPackageId}, 'repairs'),
          (${basicPackageId}, 'customers'),
          (${basicPackageId}, 'printA4'),
          (${basicPackageId}, 'deviceTypes'),
          (${basicPackageId}, 'brands');
      `);
      
      // Professional-Paket
      const proPackage = await db.execute(sql`
        INSERT INTO "packages" ("name", "description", "price_monthly")
        VALUES ('Professional', 'Erweiterte Funktionen für wachsende Unternehmen', 49.90)
        RETURNING "id";
      `);
      const proPackageId = proPackage.rows[0].id;
      
      // Professional-Features
      await db.execute(sql`
        INSERT INTO "package_features" ("package_id", "feature")
        VALUES 
          (${proPackageId}, 'dashboard'),
          (${proPackageId}, 'repairs'),
          (${proPackageId}, 'customers'),
          (${proPackageId}, 'printA4'),
          (${proPackageId}, 'deviceTypes'),
          (${proPackageId}, 'brands'),
          (${proPackageId}, 'costEstimates'),
          (${proPackageId}, 'emailTemplates'),
          (${proPackageId}, 'print58mm'),
          (${proPackageId}, 'printThermal'),
          (${proPackageId}, 'downloadRepairReport');
      `);
      
      // Enterprise-Paket
      const enterprisePackage = await db.execute(sql`
        INSERT INTO "packages" ("name", "description", "price_monthly")
        VALUES ('Enterprise', 'Komplettlösung für etablierte Reparaturshops und Ketten', 99.90)
        RETURNING "id";
      `);
      const enterprisePackageId = enterprisePackage.rows[0].id;
      
      // Enterprise-Features
      await db.execute(sql`
        INSERT INTO "package_features" ("package_id", "feature")
        VALUES 
          (${enterprisePackageId}, 'dashboard'),
          (${enterprisePackageId}, 'repairs'),
          (${enterprisePackageId}, 'customers'),
          (${enterprisePackageId}, 'printA4'),
          (${enterprisePackageId}, 'deviceTypes'),
          (${enterprisePackageId}, 'brands'),
          (${enterprisePackageId}, 'costEstimates'),
          (${enterprisePackageId}, 'emailTemplates'),
          (${enterprisePackageId}, 'print58mm'),
          (${enterprisePackageId}, 'printThermal'),
          (${enterprisePackageId}, 'downloadRepairReport'),
          (${enterprisePackageId}, 'statistics'),
          (${enterprisePackageId}, 'backup'),
          (${enterprisePackageId}, 'advancedSearch'),
          (${enterprisePackageId}, 'apiAccess'),
          (${enterprisePackageId}, 'multiUser'),
          (${enterprisePackageId}, 'advancedReporting'),
          (${enterprisePackageId}, 'customEmailTemplates'),
          (${enterprisePackageId}, 'feedbackSystem');
      `);

      console.log("Standardpakete erfolgreich erstellt.");

      // 5. Benutzer nach altem pricingPlan zu den neuen Paketen migrieren
      console.log("Migriere Benutzer von alten Tarifmodellen zu neuen Paketen...");
      
      // Basic-Benutzer auf Basic-Paket
      await db.execute(sql`
        UPDATE "users"
        SET "package_id" = ${basicPackageId}
        WHERE "pricing_plan" = 'basic' AND "package_id" IS NULL;
      `);
      
      // Professional-Benutzer auf Professional-Paket
      await db.execute(sql`
        UPDATE "users"
        SET "package_id" = ${proPackageId}
        WHERE "pricing_plan" = 'professional' AND "package_id" IS NULL;
      `);
      
      // Enterprise-Benutzer auf Enterprise-Paket
      await db.execute(sql`
        UPDATE "users"
        SET "package_id" = ${enterprisePackageId}
        WHERE "pricing_plan" = 'enterprise' AND "package_id" IS NULL;
      `);
      
      console.log("Benutzer erfolgreich zu neuen Paketen migriert.");
    }

    console.log("Migration für das Paketsystem erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Migration für das Paketsystem:", error);
    throw error;
  }
}
