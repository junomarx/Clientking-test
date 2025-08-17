import { storage } from "./storage";

/**
 * Multi-Shop Service für erweiterte Datenabfragen
 * Ermöglicht Multi-Shop Admins vollständigen Zugriff auf alle Daten ihrer zugänglichen Shops
 */
export class MultiShopService {
  
  /**
   * Prüft ob ein Benutzer Multi-Shop Admin ist und gibt seine zugänglichen Shop-IDs zurück
   */
  async getAccessibleShopIds(userId: number): Promise<number[] | null> {
    const user = await storage.getUser(userId);
    if (!user?.isMultiShopAdmin) {
      return null;
    }

    const accessibleShops = await storage.getUserAccessibleShops(userId);
    return accessibleShops.map(access => access.shopId);
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