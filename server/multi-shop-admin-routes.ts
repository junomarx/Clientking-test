import type { Express } from "express";
import { eq, sql, and, count, desc, inArray } from "drizzle-orm";
import { db } from "./db";
import { users, businessSettings, repairs, customers } from "@shared/schema";
import { storage } from "./storage";

export function registerMultiShopAdminRoutes(app: Express) {
  // Multi-Shop Admin Protection Middleware
  const protectMultiShopAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const user = req.user;
    if (!user.isMultiShopAdmin && !user.isSuperadmin) {
      return res.status(403).json({ error: "Zugriff verweigert: Multi-Shop Admin erforderlich" });
    }

    next();
  };

  // Dashboard Statistiken - NUR für berechtigte Shops!
  app.get("/api/multi-shop/dashboard-stats", protectMultiShopAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // DSGVO-KONFORM: Nur berechtigte Shops laden
      const accessibleShops = await storage.getUserAccessibleShops(userId);
      const shopIds = accessibleShops.map(shop => shop.shopId);
      
      if (shopIds.length === 0) {
        return res.json({
          totalRevenue: 0,
          openRepairs: 0,
          completedRepairs: 0,
          activeShops: 0
        });
      }

      console.log(`🔐 PERMISSION-CHECK: Multi-Shop Admin ${userId} hat Zugriff auf Shops: [${shopIds.join(', ')}]`);

      // Nur Reparaturen aus berechtigten Shops zählen
      const [openRepairsResult] = await db
        .select({ count: count() })
        .from(repairs)
        .where(and(
          eq(repairs.status, "in_progress"),
          inArray(repairs.shopId, shopIds)
        ));

      const [completedRepairsResult] = await db
        .select({ count: count() })
        .from(repairs)
        .where(and(
          eq(repairs.status, "completed"),
          inArray(repairs.shopId, shopIds)
        ));

      // Berechtigte Shops zählen
      const activeShops = shopIds.length;

      // Echte Umsätze berechnen (vereinfacht für Demo - normalerweise aus payments/invoices)
      const totalRevenue = 0; // TODO: Echte Umsatzdaten aus payments implementieren

      res.json({
        totalRevenue: totalRevenue,
        openRepairs: openRepairsResult.count,
        completedRepairs: completedRepairsResult.count,
        activeShops: activeShops
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Dashboard-Statistiken" });
    }
  });

  // Letzte Aktivitäten
  app.get("/api/multi-shop/recent-activities", protectMultiShopAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // DSGVO-KONFORM: Nur berechtigte Shops laden
      const accessibleShops = await storage.getUserAccessibleShops(userId);
      const shopIds = accessibleShops.map(shop => shop.shopId);
      
      if (shopIds.length === 0) {
        return res.json([]);
      }

      console.log(`🔐 PERMISSION-CHECK: Multi-Shop Admin ${userId} lädt Aktivitäten für berechtigte Shops: [${shopIds.join(', ')}]`);

      // Letzte Reparaturen mit Shop-Informationen - NUR aus berechtigten Shops
      const recentRepairs = await db
        .select({
          id: repairs.id,
          customerName: customers.firstName,
          deviceName: repairs.brand,
          status: repairs.status,
          createdAt: repairs.createdAt,
          shopId: repairs.shopId,
          businessName: businessSettings.businessName
        })
        .from(repairs)
        .leftJoin(customers, eq(repairs.customerId, customers.id))
        .leftJoin(businessSettings, eq(repairs.shopId, businessSettings.shopId))
        .where(inArray(repairs.shopId, shopIds))
        .orderBy(desc(repairs.createdAt))
        .limit(10);

      res.json(recentRepairs);
    } catch (error) {
      console.error("Recent activities error:", error);
      res.status(500).json({ error: "Fehler beim Laden der letzten Aktivitäten" });
    }
  });

  // Shop Übersicht - NUR BERECHTIGTE SHOPS!
  app.get("/api/multi-shop/shops", protectMultiShopAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // DSGVO-KONFORM: Nur berechtigte Shops laden
      const accessibleShops = await storage.getUserAccessibleShops(userId);
      const shopIds = accessibleShops.map(shop => shop.shopId);
      
      if (shopIds.length === 0) {
        return res.json([]);
      }

      console.log(`🔐 PERMISSION-CHECK: Multi-Shop Admin ${userId} lädt Shop-Details für berechtigte Shops: [${shopIds.join(', ')}]`);

      // NUR berechtigte Shops mit Statistiken laden
      const shopsData = await db
        .select({
          shopId: businessSettings.shopId,
          businessName: businessSettings.businessName,
          email: businessSettings.email,
          phone: businessSettings.phone
        })
        .from(businessSettings)
        .where(inArray(businessSettings.shopId, shopIds));

      // Für jeden berechtigten Shop Statistiken berechnen
      const shopsWithStats = await Promise.all(
        shopsData.map(async (shop: any) => {
          // Offene Reparaturen für diesen Shop
          const [openRepairs] = await db
            .select({ count: count() })
            .from(repairs)
            .where(and(
              eq(repairs.shopId, shop.shopId),
              eq(repairs.status, "in_progress")
            ));

          // Abgeschlossene Reparaturen für diesen Shop
          const [completedRepairs] = await db
            .select({ count: count() })
            .from(repairs)
            .where(and(
              eq(repairs.shopId, shop.shopId),
              eq(repairs.status, "completed")
            ));

          // Mitarbeiter für diesen Shop
          const [employeeCount] = await db
            .select({ count: count() })
            .from(users)
            .where(and(
              eq(users.shopId, shop.shopId),
              eq(users.isActive, true)
            ));

          return {
            ...shop,
            openRepairs: openRepairs.count,
            completedRepairs: completedRepairs.count,
            employeeCount: employeeCount.count,
            totalRevenue: 0, // TODO: Echte Umsätze aus payments implementieren
            revenueChange: "0.0" // TODO: Echte Umsatzänderung berechnen
          };
        })
      );

      res.json(shopsWithStats);
    } catch (error) {
      console.error("Shops overview error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Shop-Übersicht" });
    }
  });

  // Mitarbeiter Übersicht - NUR BERECHTIGTE SHOPS!
  app.get("/api/multi-shop/employees", protectMultiShopAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // DSGVO-KONFORM: Nur berechtigte Shops laden
      const accessibleShops = await storage.getUserAccessibleShops(userId);
      const shopIds = accessibleShops.map(shop => shop.shopId);
      
      if (shopIds.length === 0) {
        return res.json([]);
      }

      console.log(`🔐 PERMISSION-CHECK: Multi-Shop Admin ${userId} lädt Mitarbeiter für berechtigte Shops: [${shopIds.join(', ')}]`);

      // NUR Mitarbeiter aus berechtigten Shops laden
      const employees = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          isActive: users.isActive,
          shopId: users.shopId,
          businessName: businessSettings.businessName
        })
        .from(users)
        .leftJoin(businessSettings, eq(users.shopId, businessSettings.shopId))
        .where(and(
          eq(users.isActive, true),
          eq(users.isSuperadmin, false),
          eq(users.isMultiShopAdmin, false),
          inArray(users.shopId, shopIds)
        ));

      // Für jeden Mitarbeiter Reparatur-Statistiken berechnen
      const employeesWithStats = await Promise.all(
        employees.map(async (employee: any) => {
          // Reparaturen für diesen Mitarbeiter (vereinfacht - normalerweise über assignedTo)
          const [repairCount] = await db
            .select({ count: count() })
            .from(repairs)
            .where(eq(repairs.shopId, employee.shopId || 0));

          return {
            ...employee,
            repairCount: repairCount.count, // Echte Reparaturanzahl
            rating: "0.0", // TODO: Echtes Rating-System implementieren
            yearsOfService: Math.max(1, new Date().getFullYear() - new Date(employee.createdAt).getFullYear())
          };
        })
      );

      res.json(employeesWithStats);
    } catch (error) {
      console.error("Employees overview error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Mitarbeiter-Übersicht" });
    }
  });

  // Monthly Revenue Chart Data - NUR für berechtigte Shops
  app.get("/api/multi-shop/monthly-revenue", protectMultiShopAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // DSGVO-KONFORM: Nur berechtigte Shops laden
      const accessibleShops = await storage.getUserAccessibleShops(userId);
      const shopIds = accessibleShops.map(shop => shop.shopId);
      
      if (shopIds.length === 0) {
        return res.json([]);
      }

      console.log(`🔐 PERMISSION-CHECK: Multi-Shop Admin ${userId} lädt Chart-Daten für berechtigte Shops: [${shopIds.join(', ')}]`);

      // Echte Chart-Daten basierend auf berechtigten Shops
      // TODO: Implementiere echte Umsatzdaten aus payments/invoices
      const chartData = accessibleShops.map((shop: any) => ({
        name: shop.businessName,
        value: 0, // TODO: Echte Umsätze berechnen
        color: '#3b82f6' // Blau für alle Shops
      }));

      res.json(chartData);
    } catch (error) {
      console.error("Monthly revenue chart error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Chart-Daten" });
    }
  });

  // Recent Activities - NUR für berechtigte Shops
  app.get("/api/multi-shop/recent-activities", protectMultiShopAdmin, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // DSGVO-KONFORM: Nur berechtigte Shops laden
      const accessibleShops = await storage.getUserAccessibleShops(userId);
      const shopIds = accessibleShops.map(shop => shop.shopId);
      
      if (shopIds.length === 0) {
        return res.json([]);
      }

      console.log(`🔐 PERMISSION-CHECK: Multi-Shop Admin ${userId} lädt Aktivitäten für berechtigte Shops: [${shopIds.join(', ')}]`);

      // TODO: Echte Aktivitäten aus audit_logs oder repairs implementieren
      // Derzeit leere Liste - keine Mock-Daten mehr!
      res.json([]);
      
    } catch (error) {
      console.error("Recent activities error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Aktivitäten" });
    }
  });

  console.log("✅ Multi-Shop Admin routes registered");
}