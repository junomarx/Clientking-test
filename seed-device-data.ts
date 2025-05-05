/**
 * Dieses Skript fügt Beispieldaten für die Geräteverwaltung in der Datenbank hinzu
 * Es erstellt Standard-Gerätetypen, Marken, Modelle und Fehlereinträge
 */

import { db } from "./server/db";
import { userDeviceTypes, userBrands, userModels, deviceIssues } from "./shared/schema";
import { eq, and } from "drizzle-orm";

async function seedDeviceData() {
  console.log("Starte das Befüllen der Geräteverwaltung mit Beispieldaten...");

  // Standardgerätetypen hinzufügen
  const standardTypes = ["Smartphone", "Tablet", "Laptop", "Watch"];
  const deviceTypeIds: Record<string, number> = {};

  console.log("Erstelle Standard-Gerätetypen...");
  for (const typeName of standardTypes) {
    // Prüfen, ob der Typ bereits existiert
    const existingType = await db.select().from(userDeviceTypes)
      .where(eq(userDeviceTypes.name, typeName));

    if (existingType.length === 0) {
      // Typ existiert noch nicht, hinzufügen
      const [newType] = await db.insert(userDeviceTypes).values({
        name: typeName,
        userId: 10, // Superadmin User-ID
        shopId: 2,  // Shop-ID des Superadmins
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      deviceTypeIds[typeName] = newType.id;
      console.log(`Gerätetyp ${typeName} mit ID ${newType.id} wurde erstellt.`);
    } else {
      // Typ existiert bereits, ID speichern
      deviceTypeIds[typeName] = existingType[0].id;
      console.log(`Gerätetyp ${typeName} existiert bereits mit ID ${existingType[0].id}.`);
    }
  }

  // Marken für jeden Gerätetyp hinzufügen
  const brandsData: Record<string, string[]> = {
    "Smartphone": ["Apple", "Samsung", "Google", "Xiaomi", "Huawei", "OnePlus", "Sony", "Motorola", "Nokia"],
    "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Huawei", "Amazon"],
    "Laptop": ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "Microsoft", "MSI", "Razer"],
    "Watch": ["Apple", "Samsung", "Garmin", "Fitbit", "Amazfit", "Huawei", "Fossil", "Withings"]
  };

  const brandIds: Record<string, number> = {};

  console.log("Erstelle Marken für jeden Gerätetyp...");
  for (const [typeName, brands] of Object.entries(brandsData)) {
    const deviceTypeId = deviceTypeIds[typeName];
    if (!deviceTypeId) {
      console.log(`Überspringe Marken für nicht gefundenen Gerätetyp: ${typeName}`);
      continue;
    }

    for (const brandName of brands) {
      // Prüfen, ob die Marke für diesen Gerätetyp bereits existiert
      const existingBrand = await db.select().from(userBrands).where(
        and(
          eq(userBrands.name, brandName),
          eq(userBrands.deviceTypeId, deviceTypeId)
        )
      );

      if (existingBrand.length === 0) {
        // Marke existiert noch nicht für diesen Gerätetyp, hinzufügen
        const [newBrand] = await db.insert(userBrands).values({
          name: brandName,
          deviceTypeId: deviceTypeId,
          userId: 10, // Superadmin User-ID
          shopId: 2,  // Shop-ID des Superadmins
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        const key = `${typeName}-${brandName}`;
        brandIds[key] = newBrand.id;
        console.log(`Marke ${brandName} für ${typeName} mit ID ${newBrand.id} wurde erstellt.`);
      } else {
        // Marke existiert bereits, ID speichern
        const key = `${typeName}-${brandName}`;
        brandIds[key] = existingBrand[0].id;
        console.log(`Marke ${brandName} für ${typeName} existiert bereits mit ID ${existingBrand[0].id}.`);
      }
    }
  }

  // Modelle für ausgewählte Marken hinzufügen
  const modelsData: Record<string, Record<string, string[]>> = {
    "Smartphone": {
      "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone SE"],
      "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23", "Galaxy S22", "Galaxy A54", "Galaxy A34", "Galaxy Z Fold 5", "Galaxy Z Flip 5"],
      "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7", "Pixel 7a", "Pixel 6", "Pixel 6a"],
      "Xiaomi": ["Redmi Note 13 Pro", "Redmi Note 13", "Mi 13", "Mi 13 Lite", "POCO X5 Pro", "POCO X5"]
    },
    "Tablet": {
      "Apple": ["iPad Pro 12.9", "iPad Pro 11", "iPad Air", "iPad Mini", "iPad"],
      "Samsung": ["Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab A9+", "Galaxy Tab A9"]
    },
    "Laptop": {
      "Apple": ["MacBook Pro 16", "MacBook Pro 14", "MacBook Air 15", "MacBook Air 13"],
      "Dell": ["XPS 17", "XPS 15", "XPS 13", "Latitude 7440", "Inspiron 16", "Inspiron 14"],
      "Lenovo": ["ThinkPad X1 Carbon", "ThinkPad T14", "Yoga 9i", "IdeaPad Slim 5"]
    },
    "Watch": {
      "Apple": ["Watch Series 9", "Watch Ultra 2", "Watch SE"],
      "Samsung": ["Galaxy Watch 6", "Galaxy Watch 6 Classic", "Galaxy Watch 5", "Galaxy Watch 5 Pro"]
    }
  };

  console.log("Erstelle Modelle für ausgewählte Marken...");
  for (const [typeName, brandModels] of Object.entries(modelsData)) {
    for (const [brandName, models] of Object.entries(brandModels)) {
      const key = `${typeName}-${brandName}`;
      const brandId = brandIds[key];

      if (!brandId) {
        console.log(`Überspringe Modelle für nicht gefundene Marke: ${brandName} (${typeName})`);
        continue;
      }

      for (const modelName of models) {
        // Prüfen, ob das Modell bereits existiert
        const existingModel = await db.select().from(userModels).where(
          and(
            eq(userModels.name, modelName),
            eq(userModels.brandId, brandId)
          )
        );

        if (existingModel.length === 0) {
          // Modell existiert noch nicht, hinzufügen
          const [newModel] = await db.insert(userModels).values({
            name: modelName,
            brandId: brandId,
            modelSeriesId: null,
            userId: 10, // Superadmin User-ID
            shopId: 2,  // Shop-ID des Superadmins
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

          console.log(`Modell ${modelName} für ${brandName} (${typeName}) mit ID ${newModel.id} wurde erstellt.`);
        } else {
          console.log(`Modell ${modelName} für ${brandName} (${typeName}) existiert bereits mit ID ${existingModel[0].id}.`);
        }
      }
    }
  }

  // Fehlereinträge für jeden Gerätetyp hinzufügen
  const issuesData: Record<string, Array<{title: string, description: string, solution: string, severity: "low" | "medium" | "high" | "critical", isCommon: boolean}>> = {
    "Smartphone": [
      {
        title: "Displaybruch",
        description: "Das Display ist gesprungen oder gesplittert, möglicherweise nach einem Sturz.",
        solution: "Display-Austausch erforderlich. Je nach Modell kann entweder nur das Glas oder die gesamte Display-Einheit getauscht werden.",
        severity: "high",
        isCommon: true
      },
      {
        title: "Akku lädt nicht",
        description: "Gerät reagiert nicht auf Ladekabel oder lädt sehr langsam.",
        solution: "Prüfen Sie zunächst das Ladekabel und den Anschluss auf Beschädigungen. Bei Bedarf Akkuaustausch durchführen.",
        severity: "medium",
        isCommon: true
      },
      {
        title: "Wasserschaden",
        description: "Gerät wurde mit Flüssigkeit in Kontakt gebracht, Funktionsstörungen treten auf.",
        solution: "Sofort ausschalten, nicht laden. Öffnen und trocknen lassen, Korrosion beseitigen.",
        severity: "critical",
        isCommon: true
      },
      {
        title: "Kamera funktioniert nicht",
        description: "Die Kamera zeigt kein Bild oder macht unscharfe Aufnahmen.",
        solution: "Software-Reset versuchen. Bei Hardware-Defekt Kamera-Modul austauschen.",
        severity: "medium",
        isCommon: false
      }
    ],
    "Tablet": [
      {
        title: "Displaybruch",
        description: "Das Display ist gesprungen oder gesplittert, möglicherweise nach einem Sturz.",
        solution: "Display-Austausch erforderlich. Je nach Modell kann entweder nur das Glas oder die gesamte Display-Einheit getauscht werden.",
        severity: "high",
        isCommon: true
      },
      {
        title: "Akku hält nicht lange",
        description: "Die Akkulaufzeit ist deutlich kürzer als üblich.",
        solution: "Akkuaustausch durchführen. Vorher Diagnose ausführen, um die Akkukapazität zu überprüfen.",
        severity: "medium",
        isCommon: true
      },
      {
        title: "Touchscreen reagiert nicht",
        description: "Touchscreen reagiert nicht oder nur teilweise auf Berührungen.",
        solution: "Display-Einheit austauschen, da der Touchscreen in der Regel mit dem Display verbunden ist.",
        severity: "high",
        isCommon: false
      }
    ],
    "Laptop": [
      {
        title: "Startet nicht",
        description: "Gerät zeigt keine Reaktion beim Einschalten.",
        solution: "Netzteil und Akku prüfen. Wenn das nicht hilft, Mainboard-Diagnose durchführen.",
        severity: "critical",
        isCommon: true
      },
      {
        title: "Überhitzung",
        description: "Laptop wird sehr heiß und schaltet sich manchmal plötzlich ab.",
        solution: "Lüfter reinigen, Wärmeleitpaste erneuern. Bei Bedarf Lüfter austauschen.",
        severity: "high",
        isCommon: true
      },
      {
        title: "Tastatur defekt",
        description: "Einzelne oder mehrere Tasten funktionieren nicht mehr.",
        solution: "Je nach Modell einzelne Tasten oder die gesamte Tastatureinheit austauschen.",
        severity: "medium",
        isCommon: false
      },
      {
        title: "Displayschaden",
        description: "Risse oder tote Pixel im Display.",
        solution: "Display-Einheit austauschen.",
        severity: "medium",
        isCommon: true
      }
    ],
    "Watch": [
      {
        title: "Akku hält nicht lange",
        description: "Die Smartwatch entlädt sich ungewöhnlich schnell.",
        solution: "Akkuaustausch durchführen.",
        severity: "medium",
        isCommon: true
      },
      {
        title: "Wasserschaden",
        description: "Smartwatch wurde mit zu viel Wasser in Kontakt gebracht, Beschlagung unter dem Glas.",
        solution: "Öffnen, trocknen und Dichtung erneuern.",
        severity: "high",
        isCommon: false
      },
      {
        title: "Display reagiert nicht",
        description: "Touchscreen reagiert nicht auf Berührungen.",
        solution: "Display-Einheit austauschen.",
        severity: "high",
        isCommon: false
      }
    ]
  };

  console.log("Erstelle Fehlereinträge für jeden Gerätetyp...");
  for (const [typeName, issues] of Object.entries(issuesData)) {
    for (const issue of issues) {
      // Prüfen, ob der Fehlereintrag bereits existiert
      const existingIssue = await db.select().from(deviceIssues).where({
        deviceType: typeName,
        title: issue.title
      });

      if (existingIssue.length === 0) {
        // Fehlereintrag existiert noch nicht, hinzufügen
        const [newIssue] = await db.insert(deviceIssues).values({
          deviceType: typeName,
          title: issue.title,
          description: issue.description,
          solution: issue.solution,
          severity: issue.severity,
          isCommon: issue.isCommon,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        console.log(`Fehlereintrag "${issue.title}" für ${typeName} mit ID ${newIssue.id} wurde erstellt.`);
      } else {
        console.log(`Fehlereintrag "${issue.title}" für ${typeName} existiert bereits mit ID ${existingIssue[0].id}.`);
      }
    }
  }

  console.log("Befüllen der Geräteverwaltung mit Beispieldaten abgeschlossen.");
}

seedDeviceData().catch(error => {
  console.error("Fehler beim Befüllen der Geräteverwaltung:", error);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
