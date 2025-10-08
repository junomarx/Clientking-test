import { Request, Response, NextFunction } from 'express';
import { getTenantRouter, type TenantRouter } from './tenantRouter.js';

// =============================================================================
// TENANT CONTEXT MIDDLEWARE - Request-level tenant resolution
// =============================================================================
// Resolves tenant context from user authentication and session data
// Integrates with existing session-based authentication system
// Provides tenant database connections for downstream operations
// =============================================================================

interface UserTenantContext {
  userId: number;
  primaryShopId: number;
  accessibleShops: number[]; // Shops user has access to
  role: 'superadmin' | 'multi_shop_admin' | 'owner' | 'employee' | 'kiosk';
  currentShopId?: number; // Currently selected shop context
  username?: string;
  email: string;
}

interface TenantRequest extends Request {
  tenantContext?: UserTenantContext;
  tenantRouter: TenantRouter;
  // Helper methods for database operations
  getMasterDb: () => Promise<any>;
  getTenantDb: (shopId?: number) => Promise<any>;
  executeInTenant: <T>(shopId: number, operation: (db: any) => Promise<T>) => Promise<T>;
  executeMultiTenant: <T>(shopIds: number[], operation: (db: any, shopId: number) => Promise<T>) => Promise<{ shopId: number; result: T; error?: string }[]>;
}

export interface TenantMiddlewareConfig {
  /**
   * Skip tenant resolution for certain routes (e.g., public API endpoints)
   */
  skipRoutes?: string[];
  
  /**
   * Require authentication for all requests (default: true)
   */
  requireAuth?: boolean;
  
  /**
   * Allow superadmin to impersonate shops
   */
  allowSuperadminImpersonation?: boolean;
  
  /**
   * Default shop selection strategy for multi-shop users
   */
  defaultShopStrategy?: 'primary' | 'last_used' | 'first_accessible';
}

/**
 * Creates tenant context resolution middleware
 */
export function createTenantMiddleware(config: TenantMiddlewareConfig = {}) {
  const {
    skipRoutes = ['/api/auth', '/api/health', '/api/public'],
    requireAuth = true,
    allowSuperadminImpersonation = true,
    defaultShopStrategy = 'primary'
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantReq = req as TenantRequest;
    
    try {
      // Add tenant router to request
      tenantReq.tenantRouter = getTenantRouter();

      // Skip tenant resolution for specified routes
      if (shouldSkipRoute(req.path, skipRoutes)) {
        addHelperMethods(tenantReq);
        return next();
      }

      // Check authentication
      if (requireAuth && !req.session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Skip tenant resolution for unauthenticated requests if auth not required
      if (!req.session?.user) {
        addHelperMethods(tenantReq);
        return next();
      }

      // Resolve tenant context from session
      const tenantContext = await resolveTenantContext(req, defaultShopStrategy, allowSuperadminImpersonation);
      tenantReq.tenantContext = tenantContext;

      // Add helper methods
      addHelperMethods(tenantReq);

      // Log tenant context for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏪 Tenant Context: User ${tenantContext.userId}, Role: ${tenantContext.role}, Current Shop: ${tenantContext.currentShopId}`);
      }

      next();

    } catch (error) {
      console.error('❌ Tenant middleware error:', error);
      res.status(500).json({ 
        error: 'Failed to resolve tenant context',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Checks if route should skip tenant resolution
 */
function shouldSkipRoute(path: string, skipRoutes: string[]): boolean {
  return skipRoutes.some(route => path.startsWith(route));
}

/**
 * Resolves tenant context from user session and database
 */
async function resolveTenantContext(
  req: Request, 
  defaultShopStrategy: string,
  allowSuperadminImpersonation: boolean
): Promise<UserTenantContext> {
  const sessionUser = req.session!.user;
  const tenantRouter = getTenantRouter();

  // Get master database connection to resolve user's shop access
  const masterDb = (await tenantRouter.getDatabase('master')).db;

  try {
    // Fetch user details with shop access from master database
    // Note: This will need to be adapted to your actual master schema once it's integrated
    const userWithAccess = await fetchUserShopAccess(masterDb, sessionUser.id);

    if (!userWithAccess) {
      throw new Error(`User ${sessionUser.id} not found`);
    }

    // Handle superadmin shop impersonation
    let currentShopId = userWithAccess.currentShopId;
    if (allowSuperadminImpersonation && userWithAccess.role === 'superadmin') {
      const impersonateShopId = req.headers['x-impersonate-shop-id'];
      if (impersonateShopId && typeof impersonateShopId === 'string') {
        currentShopId = parseInt(impersonateShopId, 10);
        console.log(`🎭 Superadmin ${sessionUser.id} impersonating shop ${currentShopId}`);
      }
    }

    // Resolve current shop if not set
    if (!currentShopId && userWithAccess.accessibleShops.length > 0) {
      currentShopId = resolveDefaultShop(userWithAccess, defaultShopStrategy);
    }

    return {
      userId: userWithAccess.id,
      primaryShopId: userWithAccess.primaryShopId,
      accessibleShops: userWithAccess.accessibleShops,
      role: userWithAccess.role,
      currentShopId,
      username: userWithAccess.username,
      email: userWithAccess.email
    };

  } catch (error) {
    console.error(`Failed to resolve tenant context for user ${sessionUser.id}:`, error);
    throw error;
  }
}

/**
 * Fetches user with shop access information from master database
 * TODO: Adapt this to use actual master schema tables
 */
async function fetchUserShopAccess(masterDb: any, userId: number) {
  // This is a placeholder implementation that will be updated when master schema is integrated
  // For now, we'll simulate the data structure
  
  try {
    // Simulated query - will be replaced with actual Drizzle queries
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.primary_shop_id,
        COALESCE(
          ARRAY_AGG(DISTINCT usa.shop_id) FILTER (WHERE usa.shop_id IS NOT NULL),
          ARRAY[u.primary_shop_id]
        ) as accessible_shops
      FROM users u
      LEFT JOIN user_shop_access usa ON usa.user_id = u.id AND usa.is_active = true
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id, u.username, u.email, u.role, u.primary_shop_id
    `;

    const result = await masterDb.execute(query, [userId]);
    
    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserTenantContext['role'],
      primaryShopId: user.primary_shop_id,
      accessibleShops: user.accessible_shops || [user.primary_shop_id],
      currentShopId: user.primary_shop_id // Will be overridden by session logic later
    };

  } catch (error) {
    console.error('Error fetching user shop access:', error);
    throw error;
  }
}

/**
 * Resolves default shop based on strategy
 */
function resolveDefaultShop(
  userWithAccess: any,
  strategy: string
): number {
  switch (strategy) {
    case 'primary':
      return userWithAccess.primaryShopId;
    
    case 'first_accessible':
      return userWithAccess.accessibleShops[0];
    
    case 'last_used':
      // TODO: Implement last used shop tracking
      return userWithAccess.primaryShopId;
    
    default:
      return userWithAccess.primaryShopId;
  }
}

/**
 * Adds helper methods to the request object for easy database access
 */
function addHelperMethods(req: TenantRequest): void {
  // Get master database connection
  req.getMasterDb = async () => {
    const { db } = await req.tenantRouter.getDatabase('master');
    return db;
  };

  // Get tenant database connection
  req.getTenantDb = async (explicitShopId?: number) => {
    const { db } = await req.tenantRouter.getDatabase('tenant', req.tenantContext, explicitShopId);
    return db;
  };

  // Execute operation in specific tenant
  req.executeInTenant = async <T>(shopId: number, operation: (db: any) => Promise<T>): Promise<T> => {
    const { db } = await req.tenantRouter.getDatabase('tenant', req.tenantContext, shopId);
    return operation(db);
  };

  // Execute operation across multiple tenants
  req.executeMultiTenant = async <T>(
    shopIds: number[], 
    operation: (db: any, shopId: number) => Promise<T>
  ): Promise<{ shopId: number; result: T; error?: string }[]> => {
    return req.tenantRouter.executeMultiTenant(shopIds, operation);
  };
}

/**
 * Middleware to require specific shop access
 */
export function requireShopAccess(requiredShopId?: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantReq = req as TenantRequest;
    
    if (!tenantReq.tenantContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const shopId = requiredShopId || tenantReq.tenantContext.currentShopId;
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Check if user has access to the shop
    if (!tenantReq.tenantContext.accessibleShops.includes(shopId)) {
      return res.status(403).json({ 
        error: 'Access denied to shop',
        shopId 
      });
    }

    next();
  };
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: UserTenantContext['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantReq = req as TenantRequest;
    
    if (!tenantReq.tenantContext) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(tenantReq.tenantContext.role)) {
      return res.status(403).json({ 
        error: 'Insufficient privileges',
        required: allowedRoles,
        current: tenantReq.tenantContext.role
      });
    }

    next();
  };
}

/**
 * Middleware to set shop context (for multi-shop users switching shops)
 */
export function setShopContext() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantReq = req as TenantRequest;
    const requestedShopId = req.params.shopId || req.query.shopId;

    if (requestedShopId && tenantReq.tenantContext) {
      const shopId = parseInt(requestedShopId as string, 10);
      
      // Validate access
      if (!tenantReq.tenantContext.accessibleShops.includes(shopId)) {
        return res.status(403).json({ 
          error: 'Access denied to shop',
          shopId 
        });
      }

      // Update current shop context
      tenantReq.tenantContext.currentShopId = shopId;
    }

    next();
  };
}

/**
 * Express middleware to handle shop switching
 */
export async function switchShopHandler(req: Request, res: Response) {
  const tenantReq = req as TenantRequest;
  const { shopId } = req.body;

  if (!tenantReq.tenantContext) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!shopId || !tenantReq.tenantContext.accessibleShops.includes(shopId)) {
    return res.status(400).json({ 
      error: 'Invalid shop ID or access denied',
      accessibleShops: tenantReq.tenantContext.accessibleShops
    });
  }

  // Update session with new shop context
  if (req.session) {
    req.session.currentShopId = shopId;
  }

  res.json({ 
    success: true, 
    currentShopId: shopId,
    message: `Switched to shop ${shopId}`
  });
}

// Export types for use in route handlers
export type { TenantRequest, UserTenantContext };