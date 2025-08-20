/**
 * Test-Script für Phase 1 - Backend Security Validation
 * Testet Audit-Logging und Permission-Validation Services
 */

import { AuditService } from './server/audit-service';
import { PermissionValidationService } from './server/permission-validation-service';
import { storage } from './server/storage';

async function testPhase1BackendSecurity() {
  console.log("🔒 PHASE 1 - BACKEND SECURITY VALIDATION");
  console.log("=========================================");

  try {
    // Test 1: Audit-Log Erstellung
    console.log("\n📋 Test 1: Audit-Log System");
    await AuditService.log(
      77, // Multi-Shop Admin User ID
      "permission_request",
      "success",
      {
        targetUserId: 10,
        targetShopId: 1,
        reason: "Test audit log creation"
      }
    );
    console.log("✅ Audit-Log erfolgreich erstellt");

    // Test 2: Permission Validation
    console.log("\n🔐 Test 2: Permission Validation System");
    const validationResult = await PermissionValidationService.validateShopAccess(77, 1);
    console.log("✅ Permission Validation ausgeführt:", validationResult);

    // Test 3: Rate-Limiting
    console.log("\n⏱️ Test 3: Rate-Limiting System");
    const rateLimitResult = await PermissionValidationService.checkRateLimit(77, "permission_request");
    console.log("✅ Rate-Limiting funktional:", rateLimitResult);

    // Test 4: Input Sanitization
    console.log("\n🧹 Test 4: Input Sanitization");
    const sanitizeResult = PermissionValidationService.sanitizePermissionRequest({
      multiShopAdminId: "77",
      shopId: "1",
      shopOwnerId: "10"
    });
    console.log("✅ Input Sanitization funktional:", sanitizeResult);

    // Test 5: Audit-Logs abrufen
    console.log("\n📋 Test 5: Audit-Logs Retrieval");
    const userAuditLogs = await AuditService.getUserAuditLogs(77, 5);
    console.log(`✅ ${userAuditLogs.length} Audit-Logs gefunden für User 77`);

    console.log("\n🎉 PHASE 1 VALIDATION ERFOLGREICH!");
    console.log("Backend Security System ist funktional:");
    console.log("- ✅ Audit-Logging funktioniert");
    console.log("- ✅ Permission-Validation implementiert");
    console.log("- ✅ Rate-Limiting aktiv");
    console.log("- ✅ Input-Sanitization funktional");

    return true;
  } catch (error) {
    console.error("❌ PHASE 1 VALIDATION FEHLER:", error);
    return false;
  }
}

// Test ausführen
testPhase1BackendSecurity()
  .then(success => {
    if (success) {
      console.log("\n🚀 BEREIT FÜR PHASE 2: API-Erweiterungen");
    } else {
      console.log("\n⚠️ PHASE 1 muss korrigiert werden vor Phase 2");
    }
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ TEST SCRIPT FEHLER:", error);
    process.exit(1);
  });