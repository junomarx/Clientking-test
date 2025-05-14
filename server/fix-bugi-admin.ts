/**
 * Fix für bugi-Benutzerrechte
 * Stellt sicher, dass der Testbenutzer "bugi" Admin-Rechte hat
 */

import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function fixBugiAdminRights() {
  console.log("🛠️ Repariere Admin-Rechte für Benutzer bugi...");
  
  // Überprüfung, ob Benutzer existiert
  const bugiResults = await db.select().from(users).where(eq(users.username, "bugi"));
  
  if (bugiResults.length === 0) {
    console.log("⚠️ Benutzer bugi existiert nicht, überspringe Fix");
    return;
  }
  
  // Update des Benutzers
  const bugi = bugiResults[0];
  await db
    .update(users)
    .set({
      isAdmin: true,           // Admin-Rechte setzen
      shopId: 1,               // Shop-ID 1 zuweisen
      isSuperadmin: false,     // Kein Superadmin
      pricingPlan: "enterprise", // Enterprise Plan
    })
    .where(eq(users.id, bugi.id));
  
  console.log(`✅ Admin-Rechte für bugi (ID: ${bugi.id}) wurden wiederhergestellt`);
}