import type { TenantRouter } from './tenantRouter.js';
import type { UserTenantContext } from './tenantMiddleware.js';
import { eq, and } from 'drizzle-orm';
import * as masterSchema from '../../shared/masterSchema.js';

// =============================================================================
// MULTI-SHOP GROUP MANAGER - Cross-shop operations and management
// =============================================================================
// Handles users who operate multiple repair shop locations
// Manages group-level operations, shared catalogs, and cross-shop analytics
// Integrates with tenant router to execute operations across multiple shops
// =============================================================================

interface MultiShopGroup {
  id: number;
  groupName: string;
  ownerUserId: number;
  description?: string;
  sharedErrorCatalog: boolean;
  centralizedBilling: boolean;
  groupSettings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface MultiShopGroupMembership {
  id: number;
  groupId: number;
  shopId: number;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  isActive: boolean;
}

interface ShopGroupInfo {
  shopId: number;
  shopName: string;
  role: string;
  memberSince: Date;
  isActive: boolean;
}

interface GroupDashboardData {
  groupInfo: MultiShopGroup;
  shops: ShopGroupInfo[];
  aggregatedStats: {
    totalCustomers: number;
    totalRepairs: number;
    totalRevenue: number;
    avgRepairTime: number;
    pendingRepairs: number;
  };
  recentActivity: Array<{
    shopId: number;
    shopName: string;
    activity: string;
    timestamp: Date;
  }>;
}

interface CrossShopOperation<T> {
  shopId: number;
  result?: T;
  error?: string;
  executionTime: number;
}

export class MultiShopGroupManager {
  private tenantRouter: TenantRouter;

  constructor(tenantRouter: TenantRouter) {
    this.tenantRouter = tenantRouter;
  }

  /**
   * Creates a new multi-shop group
   */
  async createMultiShopGroup(
    ownerUserId: number,
    groupData: {
      groupName: string;
      description?: string;
      sharedErrorCatalog?: boolean;
      centralizedBilling?: boolean;
      groupSettings?: Record<string, any>;
    }
  ): Promise<MultiShopGroup> {
    const masterDb = (await this.tenantRouter.getDatabase('master')).db;

    try {
      console.log(`🏢 Creating multi-shop group: ${groupData.groupName}`);

      // Insert group record using Drizzle
      const [group] = await masterDb.insert(masterSchema.multiShopGroups).values({
        groupName: groupData.groupName,
        ownerUserId,
        description: groupData.description,
        sharedErrorCatalog: groupData.sharedErrorCatalog ?? true,
        centralizedBilling: groupData.centralizedBilling ?? false,
        groupSettings: groupData.groupSettings || {}
      }).returning();
      console.log(`✅ Created multi-shop group ${group.id}: ${group.groupName}`);

      return group;

    } catch (error) {
      console.error('❌ Failed to create multi-shop group:', error);
      throw new Error(`Failed to create multi-shop group: ${error}`);
    }
  }

  /**
   * Adds a shop to a multi-shop group
   */
  async addShopToGroup(
    groupId: number,
    shopId: number,
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<MultiShopGroupMembership> {
    const masterDb = (await this.tenantRouter.getDatabase('master')).db;

    try {
      console.log(`🏪 Adding shop ${shopId} to group ${groupId} with role: ${role}`);

      // Check if shop is already in the group
      const existingMembership = await masterDb.select()
        .from(masterSchema.multiShopGroupMemberships)
        .where(and(
          eq(masterSchema.multiShopGroupMemberships.groupId, groupId),
          eq(masterSchema.multiShopGroupMemberships.shopId, shopId)
        ));

      if (existingMembership.length > 0) {
        throw new Error(`Shop ${shopId} is already a member of group ${groupId}`);
      }

      // Add membership
      const [membership] = await masterDb.insert(masterSchema.multiShopGroupMemberships).values({
        groupId,
        shopId,
        role
      }).returning();
      console.log(`✅ Added shop ${shopId} to group ${groupId}`);

      return membership;

    } catch (error) {
      console.error(`❌ Failed to add shop ${shopId} to group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Gets all groups that a user has access to
   */
  async getUserGroups(userId: number): Promise<MultiShopGroup[]> {
    const masterDb = (await this.tenantRouter.getDatabase('master')).db;

    try {
      // Get groups where user is owner or has access through shops
      const groups = await masterDb.select({
        id: masterSchema.multiShopGroups.id,
        groupName: masterSchema.multiShopGroups.groupName,
        ownerUserId: masterSchema.multiShopGroups.ownerUserId,
        description: masterSchema.multiShopGroups.description,
        sharedErrorCatalog: masterSchema.multiShopGroups.sharedErrorCatalog,
        centralizedBilling: masterSchema.multiShopGroups.centralizedBilling,
        groupSettings: masterSchema.multiShopGroups.groupSettings,
        createdAt: masterSchema.multiShopGroups.createdAt,
        updatedAt: masterSchema.multiShopGroups.updatedAt
      })
        .from(masterSchema.multiShopGroups)
        .leftJoin(masterSchema.multiShopGroupMemberships, 
          eq(masterSchema.multiShopGroupMemberships.groupId, masterSchema.multiShopGroups.id))
        .leftJoin(masterSchema.userShopAccess,
          eq(masterSchema.userShopAccess.shopId, masterSchema.multiShopGroupMemberships.shopId))
        .where(/* TODO: Add proper where clause with OR conditions */);

      // For now, simplified query - will be enhanced with proper OR conditions
      const ownerGroups = await masterDb.select()
        .from(masterSchema.multiShopGroups)
        .where(eq(masterSchema.multiShopGroups.ownerUserId, userId));

      return ownerGroups as MultiShopGroup[];

    } catch (error) {
      console.error(`❌ Failed to get groups for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets all shops in a group with their details
   */
  async getGroupShops(groupId: number): Promise<ShopGroupInfo[]> {
    const masterDb = (await this.tenantRouter.getDatabase('master')).db;

    try {
      const shops = await masterDb.execute(`
        SELECT 
          s.id as shop_id,
          s.name as shop_name,
          m.role,
          m.joined_at as member_since,
          m.is_active
        FROM multi_shop_group_memberships m
        JOIN shops s ON s.id = m.shop_id
        WHERE m.group_id = $1
        ORDER BY m.joined_at
      `, [groupId]);

      return shops.map(shop => ({
        shopId: shop.shop_id,
        shopName: shop.shop_name,
        role: shop.role,
        memberSince: shop.member_since,
        isActive: shop.is_active
      }));

    } catch (error) {
      console.error(`❌ Failed to get shops for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Executes an operation across all shops in a group
   */
  async executeGroupOperation<T>(
    groupId: number,
    operation: (db: any, shopId: number) => Promise<T>
  ): Promise<CrossShopOperation<T>[]> {
    try {
      console.log(`🔄 Executing group operation for group ${groupId}`);

      // Get all active shops in the group
      const shops = await this.getGroupShops(groupId);
      const activeShopIds = shops.filter(shop => shop.isActive).map(shop => shop.shopId);

      if (activeShopIds.length === 0) {
        console.log(`⚠️ No active shops found in group ${groupId}`);
        return [];
      }

      console.log(`📊 Executing operation across ${activeShopIds.length} shops`);

      // Execute operation across all shops
      const results = await this.tenantRouter.executeMultiTenant(activeShopIds, operation);

      // Transform results to include execution time
      return results.map(result => ({
        shopId: result.shopId,
        result: result.result,
        error: result.error,
        executionTime: 0 // TODO: Add actual timing
      }));

    } catch (error) {
      console.error(`❌ Failed to execute group operation for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Gets aggregated dashboard data for a multi-shop group
   */
  async getGroupDashboard(groupId: number): Promise<GroupDashboardData> {
    try {
      console.log(`📊 Building dashboard for group ${groupId}`);

      // Get group info
      const masterDb = (await this.tenantRouter.getDatabase('master')).db;
      const groupResult = await masterDb.execute(`
        SELECT * FROM multi_shop_groups WHERE id = $1
      `, [groupId]);

      if (groupResult.length === 0) {
        throw new Error(`Group ${groupId} not found`);
      }

      const groupInfo = groupResult[0] as MultiShopGroup;

      // Get shops in group
      const shops = await this.getGroupShops(groupId);

      // Aggregate stats across all shops
      const aggregatedStats = await this.aggregateGroupStats(groupId);

      // Get recent activity across shops
      const recentActivity = await this.getGroupRecentActivity(groupId);

      return {
        groupInfo,
        shops,
        aggregatedStats,
        recentActivity
      };

    } catch (error) {
      console.error(`❌ Failed to build dashboard for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Aggregates statistics across all shops in a group
   */
  private async aggregateGroupStats(groupId: number): Promise<GroupDashboardData['aggregatedStats']> {
    const shops = await this.getGroupShops(groupId);
    const activeShopIds = shops.filter(shop => shop.isActive).map(shop => shop.shopId);

    if (activeShopIds.length === 0) {
      return {
        totalCustomers: 0,
        totalRepairs: 0,
        totalRevenue: 0,
        avgRepairTime: 0,
        pendingRepairs: 0
      };
    }

    // Execute stats queries across all tenant databases
    const statsOperation = async (db: any, shopId: number) => {
      // Note: These queries will be updated to use actual tenant schema
      const [customers, repairs, revenue, pending] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM customers'),
        db.execute('SELECT COUNT(*) as count FROM repairs'),
        db.execute(`
          SELECT SUM(CAST(estimated_cost AS DECIMAL)) as total 
          FROM repairs 
          WHERE status = 'abgeholt' AND estimated_cost IS NOT NULL
        `),
        db.execute(`
          SELECT COUNT(*) as count 
          FROM repairs 
          WHERE status IN ('eingegangen', 'in_reparatur', 'ersatzteile_bestellen')
        `)
      ]);

      return {
        customers: customers[0]?.count || 0,
        repairs: repairs[0]?.count || 0,
        revenue: parseFloat(revenue[0]?.total || '0'),
        pending: pending[0]?.count || 0
      };
    };

    const results = await this.executeGroupOperation(groupId, statsOperation);

    // Aggregate results
    const totals = results.reduce(
      (acc, result) => {
        if (result.result && !result.error) {
          acc.customers += result.result.customers;
          acc.repairs += result.result.repairs;
          acc.revenue += result.result.revenue;
          acc.pending += result.result.pending;
        }
        return acc;
      },
      { customers: 0, repairs: 0, revenue: 0, pending: 0 }
    );

    return {
      totalCustomers: totals.customers,
      totalRepairs: totals.repairs,
      totalRevenue: totals.revenue,
      avgRepairTime: 0, // TODO: Calculate average repair time
      pendingRepairs: totals.pending
    };
  }

  /**
   * Gets recent activity across all shops in a group
   */
  private async getGroupRecentActivity(groupId: number): Promise<GroupDashboardData['recentActivity']> {
    const shops = await this.getGroupShops(groupId);
    const activeShopIds = shops.filter(shop => shop.isActive).map(shop => shop.shopId);

    if (activeShopIds.length === 0) {
      return [];
    }

    // Create shop name lookup
    const shopNames = shops.reduce((acc, shop) => {
      acc[shop.shopId] = shop.shopName;
      return acc;
    }, {} as Record<number, string>);

    // Get recent activity from each shop
    const activityOperation = async (db: any, shopId: number) => {
      // Note: This query will be updated to use actual tenant schema
      const activities = await db.execute(`
        SELECT 
          'repair_created' as activity_type,
          created_at as timestamp,
          'New repair created' as description
        FROM repairs 
        WHERE created_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      return activities.map((activity: any) => ({
        shopId,
        shopName: shopNames[shopId],
        activity: activity.description,
        timestamp: activity.timestamp
      }));
    };

    const results = await this.executeGroupOperation(groupId, activityOperation);

    // Flatten and sort all activities
    const allActivities = results
      .filter(result => result.result && !result.error)
      .flatMap(result => result.result || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Keep top 20 most recent

    return allActivities;
  }

  /**
   * Validates that a user has access to a group
   */
  async validateGroupAccess(userId: number, groupId: number): Promise<boolean> {
    try {
      const userGroups = await this.getUserGroups(userId);
      return userGroups.some(group => group.id === groupId);
    } catch (error) {
      console.error(`❌ Failed to validate group access for user ${userId}, group ${groupId}:`, error);
      return false;
    }
  }

  /**
   * Synchronizes shared error catalogs across group shops
   */
  async syncGroupErrorCatalog(groupId: number): Promise<{ success: boolean; syncedShops: number; errors: string[] }> {
    try {
      console.log(`🔄 Syncing error catalog for group ${groupId}`);

      const masterDb = (await this.tenantRouter.getDatabase('master')).db;

      // Get global error catalog entries
      const globalEntries = await masterDb.execute(`
        SELECT * FROM global_error_catalog_entries WHERE is_active = true
      `);

      if (globalEntries.length === 0) {
        console.log('No global error catalog entries to sync');
        return { success: true, syncedShops: 0, errors: [] };
      }

      // Sync to all group shops
      const syncOperation = async (db: any, shopId: number) => {
        // Clear existing synced entries and insert new ones
        await db.execute('DELETE FROM error_catalog_entries WHERE is_global = true');
        
        for (const entry of globalEntries) {
          await db.execute(`
            INSERT INTO error_catalog_entries (
              error_text, for_smartphone, for_tablet, for_laptop, 
              for_smartwatch, for_gameconsole, is_global
            ) VALUES ($1, $2, $3, $4, $5, $6, true)
          `, [
            entry.error_text,
            entry.for_smartphone,
            entry.for_tablet,
            entry.for_laptop,
            entry.for_smartwatch,
            entry.for_gameconsole
          ]);
        }

        return { syncedEntries: globalEntries.length };
      };

      const results = await this.executeGroupOperation(groupId, syncOperation);
      const errors = results.filter(r => r.error).map(r => r.error!);
      const successfulSyncs = results.filter(r => !r.error).length;

      console.log(`✅ Synced error catalog to ${successfulSyncs} shops`);

      return {
        success: errors.length === 0,
        syncedShops: successfulSyncs,
        errors
      };

    } catch (error) {
      console.error(`❌ Failed to sync error catalog for group ${groupId}:`, error);
      return {
        success: false,
        syncedShops: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Removes a shop from a group
   */
  async removeShopFromGroup(groupId: number, shopId: number): Promise<void> {
    const masterDb = (await this.tenantRouter.getDatabase('master')).db;

    try {
      console.log(`🗑️ Removing shop ${shopId} from group ${groupId}`);

      await masterDb.execute(`
        DELETE FROM multi_shop_group_memberships 
        WHERE group_id = $1 AND shop_id = $2
      `, [groupId, shopId]);

      console.log(`✅ Removed shop ${shopId} from group ${groupId}`);

    } catch (error) {
      console.error(`❌ Failed to remove shop ${shopId} from group ${groupId}:`, error);
      throw error;
    }
  }
}

/**
 * Factory function to create multi-shop group manager
 */
export function createMultiShopGroupManager(tenantRouter: TenantRouter): MultiShopGroupManager {
  return new MultiShopGroupManager(tenantRouter);
}