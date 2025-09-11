/**
 * Migrationsskript für globale Gerätedaten im Deployment
 * 
 * Dieses Skript stellt sicher, dass alle Gerätetypen, Marken und Modelle
 * in jeder Deployment-Umgebung verfügbar sind, auch wenn die Datenbank
 * initial leer ist.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from "./shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool, { schema });
const { userDeviceTypes, userBrands, userModels } = schema;

// Standard-Gerätedaten für das Deployment
const deviceData = {
  deviceTypes: [
    "Smartphone",
    "Tablet", 
    "Laptop",
    "Watch",
    "Spielekonsole"
  ],

  brands: {
    "Smartphone": ["Apple", "Samsung", "Google", "Xiaomi", "Huawei", "OnePlus", "Sony", "Motorola", "Nokia", "Oppo", "Realme", "Vivo", "Honor", "Redmi"],
    "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Huawei", "Amazon", "Xiaomi"],
    "Laptop": ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Razer"],
    "Watch": ["Apple", "Samsung", "Garmin", "Fitbit", "Amazfit", "Huawei", "Xiaomi", "Withings"],
    "Spielekonsole": ["Sony", "Nintendo", "Microsoft"]
  },

  models: {
    "Apple": {
      "Smartphone": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini", "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini", "iPhone SE (3rd generation)", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X", "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7"],
      "Tablet": ["iPad Pro 12.9-inch (6th generation)", "iPad Pro 11-inch (4th generation)", "iPad Air (5th generation)", "iPad (10th generation)", "iPad mini (6th generation)"],
      "Laptop": ["MacBook Pro 16-inch M3", "MacBook Pro 14-inch M3", "MacBook Air 15-inch M2", "MacBook Air 13-inch M2"],
      "Watch": ["Apple Watch Series 9", "Apple Watch Ultra 2", "Apple Watch SE (2nd generation)"]
    },
    "Samsung": {
      "Smartphone": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22", "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy Z Fold 4", "Galaxy Z Flip 4", "Galaxy A54 5G", "Galaxy A34 5G", "Galaxy A14", "Galaxy A13", "Galaxy M54", "Galaxy M34"],
      "Tablet": ["Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab A9+", "Galaxy Tab A9"],
      "Watch": ["Galaxy Watch 6 Classic", "Galaxy Watch 6", "Galaxy Watch 5 Pro", "Galaxy Watch 5"]
    },
    "Google": {
      "Smartphone": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 7", "Pixel 6a", "Pixel 6 Pro", "Pixel 6"]
    }
  }
};

async function getOrCreateSuperadmin(): Promise<number> {
  try {
    // Versuche zuerst den Superadmin zu finden
    const result = await pool.query('SELECT id FROM users WHERE is_superadmin = true LIMIT 1');
    
    if (result.rows.length > 0) {
      console.log(`✅ Superadmin gefunden: ID ${result.rows[0].id}`);
      return result.rows[0].id;
    }

    // Falls kein Superadmin existiert, erstelle einen
    console.log('🔧 Erstelle Superadmin-Benutzer für Geräte-Migration...');
    
    // Hash für Standard-Passwort erstellen
    const { scrypt, randomBytes } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);
    
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync('SuperAdmin123!', salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString('hex')}.${salt}`;

    const insertResult = await pool.query(`
      INSERT INTO users (
        username, password, email, is_superadmin, is_active,
        company_name, owner_first_name, owner_last_name, 
        street_address, zip_code, city, country, company_phone, tax_id
      ) VALUES (
        'system-admin', $1, 'admin@system.local', true, true,
        'System Administration', 'System', 'Administrator',
        'System Street 1', '00000', 'System City', 'System', '+00000000000', 'SYS000000000'
      ) RETURNING id
    `, [hashedPassword]);

    const superadminId = insertResult.rows[0].id;
    console.log(`✅ Superadmin erstellt: ID ${superadminId}`);
    return superadminId;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Superadmins:', error);
    throw error;
  }
}

async function migrateDeviceData() {
  console.log('🚀 Starte Migration der globalen Gerätedaten...');
  
  try {
    const superadminId = await getOrCreateSuperadmin();
    let stats = {
      deviceTypes: 0,
      brands: 0,
      models: 0
    };

    // 1. Gerätetypen erstellen
    console.log('📱 Erstelle Gerätetypen...');
    for (const deviceType of deviceData.deviceTypes) {
      try {
        const [existing] = await db
          .select()
          .from(userDeviceTypes)
          .where(and(
            eq(userDeviceTypes.userId, superadminId),
            eq(userDeviceTypes.name, deviceType)
          ));

        if (!existing) {
          await db.insert(userDeviceTypes).values({
            name: deviceType,
            userId: superadminId
          });
          stats.deviceTypes++;
          console.log(`  ✅ ${deviceType}`);
        }
      } catch (error) {
        console.log(`  ⚠️ ${deviceType} bereits vorhanden`);
      }
    }

    // 2. Marken erstellen
    console.log('🏷️ Erstelle Marken...');
    for (const [deviceType, brands] of Object.entries(deviceData.brands)) {
      for (const brandName of brands) {
        try {
          const [existing] = await db
            .select()
            .from(userBrands)
            .where(and(
              eq(userBrands.userId, superadminId),
              eq(userBrands.name, brandName),
              eq(userBrands.deviceType, deviceType)
            ));

          if (!existing) {
            await db.insert(userBrands).values({
              name: brandName,
              deviceType: deviceType,
              userId: superadminId
            });
            stats.brands++;
            console.log(`  ✅ ${brandName} (${deviceType})`);
          }
        } catch (error) {
          console.log(`  ⚠️ ${brandName} (${deviceType}) bereits vorhanden`);
        }
      }
    }

    // 3. Modelle erstellen
    console.log('📋 Erstelle Modelle...');
    for (const [brandName, deviceTypes] of Object.entries(deviceData.models)) {
      for (const [deviceType, models] of Object.entries(deviceTypes)) {
        for (const modelName of models) {
          try {
            const [existing] = await db
              .select()
              .from(userModels)
              .where(and(
                eq(userModels.userId, superadminId),
                eq(userModels.name, modelName),
                eq(userModels.brand, brandName)
              ));

            if (!existing) {
              await db.insert(userModels).values({
                name: modelName,
                brand: brandName,
                deviceType: deviceType,
                userId: superadminId
              });
              stats.models++;
              console.log(`  ✅ ${brandName} ${modelName}`);
            }
          } catch (error) {
            console.log(`  ⚠️ ${brandName} ${modelName} bereits vorhanden`);
          }
        }
      }
    }

    console.log('\n🎉 Migration abgeschlossen!');
    console.log(`📊 Statistiken:`);
    console.log(`   Gerätetypen: ${stats.deviceTypes} erstellt`);
    console.log(`   Marken: ${stats.brands} erstellt`);
    console.log(`   Modelle: ${stats.models} erstellt`);

    // Überprüfung der finalen Anzahl
    const finalCounts = await Promise.all([
      db.select().from(userDeviceTypes).where(eq(userDeviceTypes.userId, superadminId)),
      db.select().from(userBrands).where(eq(userBrands.userId, superadminId)),
      db.select().from(userModels).where(eq(userModels.userId, superadminId))
    ]);

    console.log(`\n🔍 Finale Anzahl in Datenbank:`);
    console.log(`   Gerätetypen: ${finalCounts[0].length}`);
    console.log(`   Marken: ${finalCounts[1].length}`);
    console.log(`   Modelle: ${finalCounts[2].length}`);

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateDeviceData();
    console.log('\n✅ Globale Gerätedaten-Migration erfolgreich abgeschlossen!');
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Skript ausführen
main();

export { migrateDeviceData };