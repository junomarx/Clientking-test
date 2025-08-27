import { storage } from "./storage";

/**
 * Multi-Shop Service mit Permission-basierter Zugriffskontrolle
 * 
 * Implementiert das neue explizite Permission-System:
 * - Multi-Shop Admins benötigen explizite Zustimmung von Shop-Ownern
 * - Shop-Owner erhalten Pop-up Dialoge für Zugriffs-Anfragen  
 * - Nach Zustimmung: vollständiger Datenzugriff für Multi-Shop Admins
 * 
 * DSGVO-Konformität durch explizite Einverständniserklärung gewährleistet.
 */
export class MultiShopService {
  
  /**
   * Prüft ob ein Benutzer Multi-Shop Admin ist und gibt seine BERECHTIGTEN Shop-IDs zurück
   * Nur Shops mit explizit gewährten Permissions werden zurückgegeben
   */
  async getAccessibleShopIds(userId: number): Promise<number[] | null> {
    const user = await storage.getUser(userId);
    if (!user?.isMultiShopAdmin) {
      return null;
    }

    // Verwende die neue getUserAccessibleShops Methode statt getGrantedPermissions
    const accessibleShops = await storage.getUserAccessibleShops(userId);
    const shopIds = accessibleShops.map(shop => shop.id);
    
    console.log(`🔐 Permission-basierte Shops für Multi-Shop Admin ${userId}: [${shopIds.join(', ')}]`);
    return shopIds.length > 0 ? shopIds : [];
  }

  /**
   * Erstelle Permission-Anfrage für Multi-Shop Admin Zugriff
   */
  async requestShopAccess(multiShopAdminId: number, shopId: number): Promise<boolean> {
    try {
      // Prüfen ob User Multi-Shop Admin ist
      const admin = await storage.getUser(multiShopAdminId);
      if (!admin?.isMultiShopAdmin) {
        return false;
      }

      // Shop-Owner finden
      const shopOwner = await storage.getShopOwner(shopId);
      if (!shopOwner) {
        return false;
      }

      // Permission-Anfrage erstellen
      const success = await storage.createPermissionRequest(multiShopAdminId, shopId, shopOwner.id);
      
      if (success) {
        console.log(`📋 Permission-Anfrage erstellt: Admin ${multiShopAdminId} -> Shop ${shopId} (Owner: ${shopOwner.id})`);
      }
      
      return success;
    } catch (error) {
      console.error("Fehler beim Erstellen der Permission-Anfrage:", error);
      return false;
    }
  }

  /**
   * Erweiterte Reparatur-Abfrage für Multi-Shop Admins
   */
  async getAllRepairsForUser(userId: number) {
    const shopIds = await this.getAccessibleShopIds(userId);
    
    if (shopIds) {
      console.log(`🌐 Multi-Shop Service: Lade Reparaturen für ${shopIds.length} Shops`);
      return await storage.getAllRepairs(userId); // Nutzt die bereits erweiterte Methode
    }
    
    // Fallback für reguläre Benutzer
    return await storage.getAllRepairs(userId);
  }

  /**
   * Erweiterte Kunden-Abfrage für Multi-Shop Admins
   */
  async getAllCustomersForUser(userId: number) {
    const shopIds = await this.getAccessibleShopIds(userId);
    
    if (shopIds) {
      console.log(`🌐 Multi-Shop Service: Lade Kunden für ${shopIds.length} Shops`);
      return await storage.getAllCustomers(userId); // Nutzt die bereits erweiterte Methode
    }
    
    // Fallback für reguläre Benutzer  
    return await storage.getAllCustomers(userId);
  }

  /**
   * Erweiterte Kostenvoranschläge-Abfrage für Multi-Shop Admins
   */
  async getAllCostEstimatesForUser(userId: number) {
    const shopIds = await this.getAccessibleShopIds(userId);
    
    if (shopIds) {
      console.log(`🌐 Multi-Shop Service: Lade Kostenvoranschläge für ${shopIds.length} Shops`);
      // Erweiterte Implementierung kommt später
    }
    
    return await storage.getAllCostEstimates(userId);
  }

  /**
   * Cross-Shop Statistiken für Multi-Shop Admins
   */
  async getCrossShopStatistics(userId: number) {
    const shopIds = await this.getAccessibleShopIds(userId);
    
    if (!shopIds || shopIds.length === 0) {
      return null;
    }

    console.log(`🌐 Multi-Shop Service: Berechne Cross-Shop Statistiken für ${shopIds.length} Shops`);
    
    const allStats = await Promise.all(
      shopIds.map(async (shopId) => {
        const metrics = await storage.getShopMetrics(shopId);
        return { shopId, metrics };
      })
    );

    // Aggregierte Statistiken berechnen
    const aggregated = {
      totalShops: shopIds.length,
      totalRepairs: allStats.reduce((sum, stat) => sum + stat.metrics.totalRepairs, 0),
      totalActiveRepairs: allStats.reduce((sum, stat) => sum + stat.metrics.activeRepairs, 0),
      totalCompletedRepairs: allStats.reduce((sum, stat) => sum + stat.metrics.completedRepairs, 0),
      totalRevenue: allStats.reduce((sum, stat) => sum + stat.metrics.totalRevenue, 0),
      totalMonthlyRevenue: allStats.reduce((sum, stat) => sum + stat.metrics.monthlyRevenue, 0),
      totalEmployees: allStats.reduce((sum, stat) => sum + stat.metrics.totalEmployees, 0),
      shopBreakdown: allStats
    };

    return aggregated;
  }
}

export const multiShopService = new MultiShopService();