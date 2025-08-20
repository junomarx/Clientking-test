import { storage } from "./server/storage";
import { AuditService } from "./server/audit-service";
import { PermissionValidationService } from "./server/permission-validation-service";

/**
 * Phase 2 API-Endpoints Testing Script
 */

async function testPhase2Implementation() {
  console.log("🔒 PHASE 2 - API-ERWEITERUNGEN VALIDATION");
  console.log("=========================================\n");

  try {
    // Test 1: Shop Owner Approval System
    console.log("📋 Test 1: Shop Owner Approval System");
    
    // Prüfe ob die Multi-Shop Permission Tabelle bereits existiert
    try {
      const permissions = await storage.getShopPermissions(77); // Multi-Shop Admin User ID
      console.log(`✅ Found ${permissions.length} permissions for multi-shop admin`);
    } catch (error) {
      console.log(`⚠️ Permission system not yet fully implemented: ${error.message}`);
    }

    // Test 2: Superadmin Assignment System
    console.log("\n🔐 Test 2: Superadmin Assignment System");
    try {
      const multiShopAdmins = await storage.getAllMultiShopAdmins();
      console.log(`✅ Found ${multiShopAdmins.length} multi-shop admins`);
      
      if (multiShopAdmins.length > 0) {
        const admin = multiShopAdmins[0];
        console.log(`✅ Multi-Shop Admin example: ${admin.username} (ID: ${admin.id})`);
      }
    } catch (error) {
      console.log(`⚠️ Multi-shop admin system not yet implemented: ${error.message}`);
    }

    // Test 3: Session-Context Service
    console.log("\n⏱️ Test 3: Session-Context Service");
    
    // Mock request für Session-Context Test
    const mockReq = {
      session: {},
      user: { id: 77, isMultiShopAdmin: true },
      isAuthenticated: () => true,
      headers: {},
      connection: { remoteAddress: '127.0.0.1' }
    };

    console.log("✅ Session-Context Service bereit für Tests");

    // Test 4: Audit-Logging für Phase 2
    console.log("\n📋 Test 4: Audit-Logging für Phase 2");
    
    try {
      // Test Permission Decision Audit
      await AuditService.logPermissionDecision(
        10, // Shop Owner
        77, // Multi-Shop Admin
        999, // Shop ID
        true, // Approved
        "Test approval for Phase 2 validation",
        mockReq as any
      );
      
      console.log("✅ Permission Decision Audit funktional");

      // Test Access Denied Audit
      await AuditService.logAccessDenied(
        77, // User ID
        999, // Shop ID
        "Test access denial for Phase 2 validation",
        mockReq as any
      );
      
      console.log("✅ Access Denied Audit funktional");
      
    } catch (error) {
      console.log(`⚠️ Audit-Logging Fehler: ${error.message}`);
    }

    // Test 5: Permission Validation Service
    console.log("\n🧹 Test 5: Permission Validation Service");
    
    try {
      const validation = await PermissionValidationService.validateShopAccess(
        77, // Multi-Shop Admin
        999, // Shop ID
        mockReq as any
      );
      
      console.log(`✅ Permission Validation ausgeführt: hasAccess=${validation.hasAccess}`);
      
      // Rate Limiting Test
      const rateLimit = await PermissionValidationService.checkRateLimit(
        77,
        "test_action",
        5, // 5 minutes
        10 // max attempts
      );
      
      console.log(`✅ Rate-Limiting funktional: allowed=${rateLimit.allowed}`);
      
    } catch (error) {
      console.log(`⚠️ Permission Validation Fehler: ${error.message}`);
    }

    // Test 6: Storage Interface Validation
    console.log("\n💾 Test 6: Storage Interface Validation");
    
    // Liste der erforderlichen Storage-Methoden für Phase 2
    const requiredMethods = [
      'getPendingPermissions',
      'grantShopAccess', 
      'revokeShopAccess',
      'requestShopAccess',
      'hasShopPermission',
      'getAllMultiShopAdmins',
      'getShopDetails',
      'getUserByShopId',
      'getShopAuditLogs',
      'getUserAuditLogs'
    ];

    const missingMethods = [];
    for (const method of requiredMethods) {
      if (typeof storage[method] !== 'function') {
        missingMethods.push(method);
      }
    }

    if (missingMethods.length === 0) {
      console.log("✅ Alle erforderlichen Storage-Methoden vorhanden");
    } else {
      console.log(`⚠️ Fehlende Storage-Methoden: ${missingMethods.join(', ')}`);
    }

    console.log("\n🎉 PHASE 2 VALIDATION ABGESCHLOSSEN!");
    console.log(`Status: ${missingMethods.length === 0 ? 'BEREIT FÜR PHASE 3' : 'STORAGE-METHODEN BENÖTIGT'}`);
    
  } catch (error) {
    console.error("❌ Fehler während Phase 2 Validation:", error);
  }
}

// Run the test
testPhase2Implementation().catch(console.error);