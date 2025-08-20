import { Request, Response } from "express";
import { storage } from "./storage";
import { AuditService } from "./audit-service";
import { PermissionValidationService } from "./permission-validation-service";

/**
 * Superadmin API Routes für Multi-Shop Admin Management
 */

/**
 * POST /api/superadmin/assign-shops
 * Superadmin weist Multi-Shop Admin Shops zu
 */
export async function assignShopsToMultiShopAdmin(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user!.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const superadminId = req.user!.id;
    const { multiShopAdminId, shopIds, reason } = req.body;

    // Input-Validation
    const validation = PermissionValidationService.sanitizePermissionRequest({
      multiShopAdminId,
      shopId: shopIds?.[0], // Für die Basis-Validierung
      shopOwnerId: superadminId
    });

    if (!validation.valid || !Array.isArray(shopIds) || shopIds.length === 0) {
      return res.status(400).json({ 
        error: "Ungültige Parameter", 
        details: validation.errors 
      });
    }

    // Prüfen ob User tatsächlich Multi-Shop Admin ist
    const targetAdmin = await storage.getUser(multiShopAdminId);
    if (!targetAdmin || !targetAdmin.isMultiShopAdmin || !targetAdmin.isActive) {
      return res.status(400).json({ error: "User ist kein aktiver Multi-Shop Admin" });
    }

    // Rate-Limiting für Bulk-Assignments
    const rateLimitCheck = await PermissionValidationService.checkRateLimit(
      superadminId,
      "assign_shops",
      15, // 15 Minuten Window
      20 // Max 20 Assignments pro 15 Minuten
    );

    if (!rateLimitCheck.allowed) {
      await AuditService.log(
        superadminId,
        "shop_assignment_rate_limited",
        "denied",
        { reason: "Rate limit exceeded", req }
      );
      return res.status(429).json({ 
        error: "Zu viele Assignment-Anfragen. Bitte warten Sie einen Moment." 
      });
    }

    const results = [];
    const errors = [];

    // Jede Shop-Zuweisung einzeln verarbeiten
    for (const shopId of shopIds) {
      try {
        // Shop Owner für diesen Shop finden
        const shopOwner = await storage.getUserByShopId(shopId);
        if (!shopOwner) {
          errors.push(`Shop ${shopId}: Kein Shop Owner gefunden`);
          continue;
        }

        // Prüfen ob bereits eine Permission existiert
        const existingPermission = await storage.hasShopPermission(multiShopAdminId, shopId);
        if (existingPermission) {
          errors.push(`Shop ${shopId}: Permission bereits vorhanden`);
          continue;
        }

        // Permission-Request erstellen (wartet auf Shop Owner Approval)
        const permission = await storage.requestShopAccess(
          multiShopAdminId,
          shopId,
          shopOwner.id
        );

        // Audit-Log für die Zuweisung
        await AuditService.log(
          superadminId,
          "shop_assignment",
          "success",
          {
            targetUserId: multiShopAdminId,
            targetShopId: shopId,
            reason: reason || `Superadmin assigned shop ${shopId} to multi-shop admin ${multiShopAdminId}`,
            req
          }
        );

        results.push({
          shopId,
          permissionId: permission.id,
          status: 'pending_owner_approval',
          message: `Shop ${shopId} zugewiesen - wartet auf Shop Owner Genehmigung`
        });

      } catch (error) {
        console.error(`Fehler bei Shop ${shopId} Assignment:`, error);
        errors.push(`Shop ${shopId}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }

    // Übergreifendes Audit-Log für die gesamte Aktion
    await AuditService.log(
      superadminId,
      "bulk_shop_assignment",
      results.length > 0 ? "success" : "failed",
      {
        targetUserId: multiShopAdminId,
        reason: `Assigned ${results.length} shops, ${errors.length} errors`,
        req
      }
    );

    res.json({
      success: results.length > 0,
      assigned: results.length,
      errorCount: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error("Fehler beim Shop-Assignment:", error);
    res.status(500).json({ error: "Server-Fehler beim Shop-Assignment" });
  }
}

/**
 * POST /api/superadmin/bulk-assign
 * Bulk-Zuweisung von Shops an Multiple Multi-Shop Admins
 */
export async function bulkAssignShops(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user!.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const superadminId = req.user!.id;
    const { assignments, reason } = req.body;

    // assignments: Array von { multiShopAdminId: number, shopIds: number[] }
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "Keine Assignments angegeben" });
    }

    // Rate-Limiting für Bulk-Operations
    const rateLimitCheck = await PermissionValidationService.checkRateLimit(
      superadminId,
      "bulk_assign",
      30, // 30 Minuten Window
      5 // Max 5 Bulk-Assignments pro 30 Minuten
    );

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: "Bulk-Assignment-Limit erreicht. Bitte warten Sie 30 Minuten." 
      });
    }

    const allResults = [];
    const allErrors = [];

    for (const assignment of assignments) {
      const { multiShopAdminId, shopIds } = assignment;

      try {
        // Für jeden Assignment die normale assign-Funktion aufrufen
        const assignmentResult = await processShopAssignment(
          multiShopAdminId,
          shopIds,
          superadminId,
          reason,
          req
        );

        allResults.push({
          multiShopAdminId,
          ...assignmentResult
        });
      } catch (error) {
        allErrors.push({
          multiShopAdminId,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    await AuditService.log(
      superadminId,
      "bulk_assignment_completed",
      "success",
      {
        reason: `Bulk assignment: ${allResults.length} successful, ${allErrors.length} errors`,
        req
      }
    );

    res.json({
      success: allResults.length > 0,
      completedAssignments: allResults.length,
      failedAssignments: allErrors.length,
      results: allResults,
      errors: allErrors
    });
  } catch (error) {
    console.error("Fehler beim Bulk-Assignment:", error);
    res.status(500).json({ error: "Server-Fehler beim Bulk-Assignment" });
  }
}

/**
 * GET /api/superadmin/permission-overview
 * Superadmin bekommt Übersicht über alle Permissions
 */
export async function getPermissionOverview(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
          console.log(`✅ Superadmin via X-User-ID Header: ${user.username}`);
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if ((!req.isAuthenticated() || !req.user || !req.user.isSuperadmin)) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const superadminId = req.user!.id;

    // Alle Multi-Shop Admins laden
    const multiShopAdmins = await storage.getAllMultiShopAdmins();

    const overview = await Promise.all(
      multiShopAdmins.map(async (admin: any) => {
        const pendingPermissions = await storage.getPendingPermissions(admin.id);
        const totalShopsAccess = admin.accessibleShops.length;
        
        return {
          adminId: admin.id,
          adminName: admin.username,
          adminEmail: admin.email,
          isActive: admin.isActive,
          totalGrantedShops: totalShopsAccess,
          pendingRequests: pendingPermissions.length,
          accessibleShops: admin.accessibleShops.map((shop: any) => ({
            id: shop.id,
            name: shop.name,
            businessName: shop.businessName || shop.name
          }))
        };
      })
    );

    // Audit-Log temporär deaktiviert da AuditService nicht verfügbar
    console.log(`getPermissionOverview: ${overview.length} Multi-Shop Admins gefunden für Superadmin ${superadminId}`);

    res.json({
      multiShopAdmins: overview,
      totalMultiShopAdmins: overview.length
    });
  } catch (error) {
    console.error("Fehler beim Laden der Permission-Übersicht:", error);
    res.status(500).json({ error: "Server-Fehler beim Laden der Übersicht" });
  }
}

/**
 * Helper-Funktion für Shop-Assignment Processing
 */
async function processShopAssignment(
  multiShopAdminId: number,
  shopIds: number[],
  superadminId: number,
  reason: string,
  req: Request
) {
  const results = [];
  const errors = [];

  for (const shopId of shopIds) {
    try {
      const shopOwner = await storage.getUserByShopId(shopId);
      if (!shopOwner) {
        errors.push(`Shop ${shopId}: Kein Shop Owner gefunden`);
        continue;
      }

      const existingPermission = await storage.hasShopPermission(multiShopAdminId, shopId);
      if (existingPermission) {
        errors.push(`Shop ${shopId}: Permission bereits vorhanden`);
        continue;
      }

      const permission = await storage.requestShopAccess(
        multiShopAdminId,
        shopId,
        shopOwner.id
      );

      results.push({
        shopId,
        permissionId: permission.id,
        status: 'pending_owner_approval'
      });

    } catch (error) {
      errors.push(`Shop ${shopId}: ${error instanceof Error ? error.message : 'Fehler'}`);
    }
  }

  return { results, errors, assigned: results.length };
}

/**
 * Registriert alle Superadmin Routes
 */
// Superadmin Statistics Route
export async function getSuperadminStats(req: Request, res: Response) {
  try {
    // Prüfe X-User-ID Header als Fallback
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
          console.log(`✅ Superadmin via X-User-ID Header: ${user.username}`);
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    console.log('🔍 Superadmin Stats Request:', {
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'no method',
      user: req.user ? { id: req.user.id, username: req.user.username, isSuperadmin: req.user.isSuperadmin } : 'no user',
      sessionID: req.sessionID,
      hasXUserID: !!customUserId,
      cookies: req.headers.cookie ? 'present' : 'missing'
    });

    if ((!req.isAuthenticated() || !req.user || !req.user.isSuperadmin)) {
      console.log('❌ Superadmin-Berechtigung verweigert');
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    // Alle Statistiken sammeln
    const totalUsers = await storage.getTotalUsersCount();
    const activeUsers = await storage.getActiveUsersCount();
    const totalShops = await storage.getTotalShopsCount();
    const totalRepairs = await storage.getTotalRepairsCount();

    const stats = {
      users: {
        totalUsers: totalUsers.toString(),
        activeUsers: activeUsers.toString(),
        inactiveUsers: (totalUsers - activeUsers).toString()
      },
      shops: {
        totalShops: totalShops.toString()
      },
      repairs: {
        totalRepairs: totalRepairs.toString()
      },
      packages: {
        totalPackages: "0"
      },
      orders: {
        totalOrders: "0"
      },
      revenue: {
        totalRevenue: "0"
      }
    };

    res.json(stats);
  } catch (error) {
    console.error("Fehler beim Laden der Superadmin-Statistiken:", error);
    res.status(500).json({ error: "Server-Fehler beim Laden der Statistiken" });
  }
}

// Superadmin Users Route
export async function getSuperadminUsers(req: Request, res: Response) {
  try {
    // Prüfe X-User-ID Header als Fallback
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
          console.log(`✅ Superadmin via X-User-ID Header: ${user.username}`);
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    console.log('🔍 Superadmin Users Request:', {
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'no method',
      user: req.user ? { id: req.user.id, username: req.user.username, isSuperadmin: req.user.isSuperadmin } : 'no user',
      sessionID: req.sessionID,
      hasXUserID: !!customUserId,
      cookies: req.headers.cookie ? 'present' : 'missing'
    });

    if ((!req.isAuthenticated() || !req.user || !req.user.isSuperadmin)) {
      console.log('❌ Superadmin-Berechtigung verweigert');
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer:", error);
    res.status(500).json({ error: "Server-Fehler beim Laden der Benutzer" });
  }
}

export function registerSuperadminRoutes(app: any) {
  app.get('/api/superadmin/stats', getSuperadminStats);
  app.get('/api/superadmin/users', getSuperadminUsers);
  app.post('/api/superadmin/assign-shops', assignShopsToMultiShopAdmin);
  app.post('/api/superadmin/bulk-assign', bulkAssignShops);
  app.get('/api/superadmin/permission-overview', getPermissionOverview);
  
  // Device management routes
  app.get('/api/superadmin/device-types', getSuperadminDeviceTypes);
  app.get('/api/superadmin/brands', getSuperadminBrands);
  app.get('/api/superadmin/models', getSuperadminModels);
  app.get('/api/superadmin/user-device-types', getSuperadminUserDeviceTypes);
  app.get('/api/superadmin/error-catalog', getSuperadminErrorCatalog);
  
  // User details route
  app.get('/api/superadmin/users/:id', getSuperadminUserDetails);
  app.patch('/api/superadmin/users/:id', updateSuperadminUser);
  app.get('/api/superadmin/repair-statistics', getSuperadminRepairStatistics);
  app.get('/api/superadmin/device-statistics', getSuperadminDeviceStatistics);
  app.get('/api/superadmin/multi-shop-admins', getSuperadminMultiShopAdmins);
  app.get('/api/superadmin/stats-dsgvo', getSuperadminStatsDsgvo);
  app.get('/api/superadmin/user-business-settings/:id', getSuperadminUserBusinessSettings);
  
  console.log('✅ Superadmin routes registered');
}

// Multi-Shop Admins Route
export async function getSuperadminMultiShopAdmins(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    // Multi-Shop-Admins mit ihren zugänglichen Shops abrufen
    const multiShopAdmins = await storage.getAllMultiShopAdminsWithShops();
    console.log(`getSuperadminMultiShopAdmins: ${multiShopAdmins.length} Multi-Shop-Admins geladen`);
    res.json(multiShopAdmins);
  } catch (error) {
    console.error("Fehler beim Laden der Multi-Shop-Admins:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// DSGVO Statistics Route
export async function getSuperadminStatsDsgvo(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    // DSGVO-konforme anonymisierte Statistiken abrufen
    const dsgvoStats = await storage.getAnonymizedRepairStatistics();
    console.log(`getSuperadminStatsDsgvo: DSGVO-Statistiken geladen`);
    res.json(dsgvoStats);
  } catch (error) {
    console.error("Fehler beim Laden der DSGVO-Statistiken:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// User Business Settings Route
export async function getSuperadminUserBusinessSettings(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const userId = parseInt(req.params.id);
    const businessSettings = await storage.getBusinessSettingsForUser(userId);
    console.log(`getSuperadminUserBusinessSettings: Geschäftsdaten für Benutzer ${userId} geladen`);
    res.json(businessSettings);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer-Geschäftsdaten:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Device Types Route
export async function getSuperadminDeviceTypes(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const deviceTypes = await storage.getAllDeviceTypes();
    res.json(deviceTypes);
  } catch (error) {
    console.error("Fehler beim Laden der Gerätetypen:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Brands Route
export async function getSuperadminBrands(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const brands = await storage.getAllBrands();
    res.json(brands);
  } catch (error) {
    console.error("Fehler beim Laden der Marken:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Models Route
export async function getSuperadminModels(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    console.log('DIRECT MODELS ROUTE: Lade alle Modelle für Superadmin');
    const models = await storage.getAllModels();
    console.log(`DIRECT MODELS ROUTE: ${models.length} Modelle gefunden`);
    res.json(models);
  } catch (error) {
    console.error("Fehler beim Laden der Modelle:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Repair Statistics Route - DSGVO konform
export async function getSuperadminRepairStatistics(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    // DSGVO-konforme anonymisierte Statistiken aller Reparaturen 
    const repairStats = await storage.getAnonymizedRepairStatistics();
    console.log(`getSuperadminRepairStatistics: Anonymisierte Statistiken generiert`);
    res.json(repairStats);
  } catch (error) {
    console.error("Fehler beim Laden der Reparaturstatistiken:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Device Statistics Route  
export async function getSuperadminDeviceStatistics(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    // Gerätestatistiken abrufen
    const deviceStats = await storage.getDeviceStatistics();
    console.log(`getSuperadminDeviceStatistics: Device-Statistiken geladen`);
    res.json(deviceStats);
  } catch (error) {
    console.error("Fehler beim Laden der Gerätestatistiken:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// User Device Types Route
export async function getSuperadminUserDeviceTypes(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const userDeviceTypes = await storage.getAllUserDeviceTypes();
    res.json(userDeviceTypes);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer-Gerätetypen:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Error Catalog Route
export async function getSuperadminErrorCatalog(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const errorCatalog = await storage.getAllErrorCatalogEntries();
    res.json(errorCatalog);
  } catch (error) {
    console.error("Fehler beim Laden des Fehlerkatalogs:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// User Details Route
export async function getSuperadminUserDetails(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    res.json(user);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzerdetails:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}

// Update User Route mit Business Settings Synchronisation
export async function updateSuperadminUser(req: Request, res: Response) {
  try {
    // Header-Fallback für Authentifizierung
    const customUserId = req.headers['x-user-id'];
    if (customUserId && !req.user) {
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user && user.isSuperadmin) {
          req.user = user;
        }
      } catch (error) {
        console.error('Fehler beim X-User-ID Header:', error);
      }
    }

    if (!req.user || !req.user.isSuperadmin) {
      return res.status(403).json({ error: "Superadmin-Berechtigung erforderlich" });
    }

    const userId = parseInt(req.params.id);
    const updateData = req.body;
    
    // 1. Benutzer-Daten aktualisieren
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    // 2. Business Settings synchronisieren (falls relevant)
    if (updateData.businessName || updateData.ownerFirstName || updateData.ownerLastName || 
        updateData.streetAddress || updateData.zipCode || updateData.city || 
        updateData.country || updateData.phone || updateData.taxId || updateData.website) {
      
      try {
        // Versuche Business Settings zu aktualisieren
        const businessUpdateData = {
          businessName: updateData.businessName,
          ownerFirstName: updateData.ownerFirstName, 
          ownerLastName: updateData.ownerLastName,
          streetAddress: updateData.streetAddress,
          zipCode: updateData.zipCode,
          city: updateData.city,
          country: updateData.country,
          phone: updateData.phone,
          taxId: updateData.taxId,
          website: updateData.website
        };

        // Entferne undefined-Werte 
        Object.keys(businessUpdateData).forEach(key => {
          if ((businessUpdateData as any)[key] === undefined) {
            delete (businessUpdateData as any)[key];
          }
        });

        if (Object.keys(businessUpdateData).length > 0) {
          await storage.updateBusinessSettingsForUser(userId, businessUpdateData);
          console.log(`✅ Business Settings für Benutzer ${userId} synchronisiert`);
        }
      } catch (error) {
        console.log(`⚠️ Warnung: Business Settings konnten nicht synchronisiert werden:`, error);
        // Fehler bei Business Settings sind nicht kritisch - User Update war erfolgreich
      }
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Benutzers:", error);
    res.status(500).json({ error: "Server-Fehler" });
  }
}