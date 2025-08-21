import type { Express } from "express";
import { eq, sql, and, count, desc } from "drizzle-orm";
import { db } from "./db";
import { users, businessSettings, repairs, customers } from "@shared/schema";

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

  // Dashboard Statistiken
  app.get("/api/multi-shop/dashboard-stats", protectMultiShopAdmin, async (req, res) => {
    try {
      // Gesamtumsatz berechnen (vereinfacht - normalerweise aus Rechnungen/Zahlungen)
      const totalRevenue = 89420; // Mock-Wert für Demo

      // Offene Reparaturen zählen
      const [openRepairsResult] = await db
        .select({ count: count() })
        .from(repairs)
        .where(eq(repairs.status, "in_progress"));

      // Abgeschlossene Reparaturen zählen  
      const [completedRepairsResult] = await db
        .select({ count: count() })
        .from(repairs)
        .where(eq(repairs.status, "completed"));

      // Aktive Shops zählen
      const [activeShopsResult] = await db
        .select({ count: count() })
        .from(businessSettings);

      res.json({
        totalRevenue,
        openRepairs: openRepairsResult.count,
        completedRepairs: completedRepairsResult.count,
        activeShops: activeShopsResult.count
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Dashboard-Statistiken" });
    }
  });

  // Monatliche Umsätze
  app.get("/api/multi-shop/monthly-revenue", protectMultiShopAdmin, async (req, res) => {
    try {
      // Mock-Daten für Demo - normalerweise aus Zahlungstabelle
      const monthlyData = [
        { month: "Jan", shopWien: 32000, shopGraz: 25000, shopLinz: 18000 },
        { month: "Feb", shopWien: 35000, shopGraz: 28000, shopLinz: 22000 },
        { month: "Mar", shopWien: 38000, shopGraz: 30000, shopLinz: 25000 },
        { month: "Apr", shopWien: 42000, shopGraz: 32000, shopLinz: 28000 },
        { month: "Mai", shopWien: 45000, shopGraz: 35000, shopLinz: 30000 }
      ];

      res.json(monthlyData);
    } catch (error) {
      console.error("Monthly revenue error:", error);
      res.status(500).json({ error: "Fehler beim Laden der monatlichen Umsätze" });
    }
  });

  // Letzte Aktivitäten
  app.get("/api/multi-shop/recent-activities", protectMultiShopAdmin, async (req, res) => {
    try {
      // Letzte Reparaturen mit Shop-Informationen
      const recentRepairs = await db
        .select({
          id: repairs.id,
          customerName: customers.firstName, // customers hat firstName, nicht name
          deviceName: repairs.brand, // repairs hat brand, nicht deviceName
          status: repairs.status,
          createdAt: repairs.createdAt,
          shopId: repairs.shopId,
          businessName: businessSettings.businessName
        })
        .from(repairs)
        .leftJoin(customers, eq(repairs.customerId, customers.id))
        .leftJoin(businessSettings, eq(repairs.shopId, businessSettings.shopId))
        .orderBy(desc(repairs.createdAt))
        .limit(10);

      res.json(recentRepairs);
    } catch (error) {
      console.error("Recent activities error:", error);
      res.status(500).json({ error: "Fehler beim Laden der letzten Aktivitäten" });
    }
  });

  // Shop Übersicht
  app.get("/api/multi-shop/shops", protectMultiShopAdmin, async (req, res) => {
    try {
      // Alle Shops mit Statistiken laden
      const shopsData = await db
        .select({
          shopId: businessSettings.shopId,
          businessName: businessSettings.businessName,
          email: businessSettings.email,
          phone: businessSettings.phone
        })
        .from(businessSettings);

      // Für jeden Shop Statistiken berechnen
      const shopsWithStats = await Promise.all(
        shopsData.map(async (shop) => {
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
            totalRevenue: Math.floor(Math.random() * 50000) + 20000, // Mock für Demo
            revenueChange: (Math.random() * 10 - 2).toFixed(1) // Mock für Demo
          };
        })
      );

      res.json(shopsWithStats);
    } catch (error) {
      console.error("Shops overview error:", error);
      res.status(500).json({ error: "Fehler beim Laden der Shop-Übersicht" });
    }
  });

  // Mitarbeiter Übersicht
  app.get("/api/multi-shop/employees", protectMultiShopAdmin, async (req, res) => {
    try {
      // Alle Mitarbeiter mit Shop-Informationen laden
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
          eq(users.role, 'employee') // NUR echte Mitarbeiter, nicht Owner oder Kiosk
        ));

      // Für jeden Mitarbeiter Reparatur-Statistiken berechnen
      const employeesWithStats = await Promise.all(
        employees.map(async (employee) => {
          // Reparaturen für diesen Mitarbeiter (vereinfacht - normalerweise über assignedTo)
          const [repairCount] = await db
            .select({ count: count() })
            .from(repairs)
            .where(eq(repairs.shopId, employee.shopId));

          return {
            ...employee,
            repairCount: Math.floor(repairCount.count * Math.random()) + 50, // Mock-Verteilung
            rating: (4.2 + Math.random() * 0.8).toFixed(1), // Mock-Rating
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

  console.log("✅ Multi-Shop Admin routes registered");
}