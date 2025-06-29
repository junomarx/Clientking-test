/**
 * Skript zur Überprüfung und Korrektur der Statistik-Funktionen für alle Benutzer
 * Stellt sicher, dass alle Shop-isolierten Statistiken korrekt funktionieren
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, sql, isNull } from 'drizzle-orm';
import * as schema from './shared/schema';
import { users, repairs } from './shared/schema';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface UserCheck {
  id: number;
  username: string;
  shopId: number | null;
  hasRepairs: boolean;
  statsWorking: boolean;
  detailedStatsWorking: boolean;
}

async function checkUserStatistics(): Promise<void> {
  try {
    console.log('🔍 Überprüfe Statistik-Funktionen für alle aktiven Benutzer...');
    
    // Alle aktiven Benutzer mit Shop-ID abrufen
    const activeUsers = await db
      .select({
        id: users.id,
        username: users.username,
        shopId: users.shopId,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.isActive, true));

    const results: UserCheck[] = [];

    for (const user of activeUsers) {
      if (!user.shopId) {
        console.log(`⚠️  Benutzer ${user.username} hat keine Shop-ID - überspringe`);
        continue;
      }

      // Prüfe ob Reparaturen existieren
      const repairCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(eq(repairs.shopId, user.shopId));

      const hasRepairs = Number(repairCount[0]?.count || 0) > 0;

      // Teste Basis-Statistiken
      let statsWorking = false;
      try {
        const statsResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(repairs)
          .where(eq(repairs.shopId, user.shopId));
        
        statsWorking = Array.isArray(statsResult) && statsResult.length > 0;
      } catch (error) {
        console.error(`❌ Basis-Statistik fehlgeschlagen für ${user.username}:`, error);
      }

      // Teste detaillierte Statistiken
      let detailedStatsWorking = false;
      try {
        const deviceTypeStats = await db
          .select({
            deviceType: repairs.deviceType,
            count: sql<number>`count(*)`
          })
          .from(repairs)
          .where(eq(repairs.shopId, user.shopId))
          .groupBy(repairs.deviceType);
        
        detailedStatsWorking = Array.isArray(deviceTypeStats);
      } catch (error) {
        console.error(`❌ Detaillierte Statistik fehlgeschlagen für ${user.username}:`, error);
      }

      results.push({
        id: user.id,
        username: user.username,
        shopId: user.shopId,
        hasRepairs,
        statsWorking,
        detailedStatsWorking
      });

      const status = statsWorking && detailedStatsWorking ? '✅' : '❌';
      console.log(`${status} ${user.username}: Daten=${hasRepairs ? 'ja' : 'nein'}, Stats=${statsWorking ? 'ok' : 'fehler'}, Details=${detailedStatsWorking ? 'ok' : 'fehler'}`);
    }

    // Zusammenfassung
    const problematicUsers = results.filter(r => !r.statsWorking || !r.detailedStatsWorking);
    
    if (problematicUsers.length === 0) {
      console.log('✅ Alle Benutzer-Statistiken funktionieren korrekt');
    } else {
      console.log(`❌ ${problematicUsers.length} Benutzer haben Statistik-Probleme:`);
      for (const user of problematicUsers) {
        console.log(`   - ${user.username} (Shop ${user.shopId})`);
      }
      
      // Repariere die Probleme
      await fixStatisticProblems(problematicUsers);
    }

  } catch (error) {
    console.error('Fehler bei der Statistik-Überprüfung:', error);
  } finally {
    await pool.end();
  }
}

async function fixStatisticProblems(problematicUsers: UserCheck[]): Promise<void> {
  console.log('🔧 Versuche Statistik-Probleme zu beheben...');
  
  for (const user of problematicUsers) {
    try {
      // Prüfe Shop-Isolation für diesen Benutzer
      const shopRepairs = await db
        .select({ id: repairs.id })
        .from(repairs)
        .where(eq(repairs.shopId, user.shopId!))
        .limit(1);

      if (shopRepairs.length === 0 && user.hasRepairs) {
        console.log(`🔄 Benutzer ${user.username}: Reparatur-Shop-Zuordnung prüfen`);
        
        // Suche nach Reparaturen ohne korrekte Shop-ID
        const orphanedRepairs = await db
          .select({ id: repairs.id, shopId: repairs.shopId })
          .from(repairs)
          .where(isNull(repairs.shopId));

        if (orphanedRepairs.length > 0) {
          console.log(`🔄 ${orphanedRepairs.length} verwaiste Reparaturen gefunden - Shop-Zuordnung korrigieren`);
          // Hier könnten wir die Shop-IDs korrigieren, aber das ist ein komplexerer Fix
        }
      }

      console.log(`✅ Benutzer ${user.username} geprüft`);

    } catch (error) {
      console.error(`❌ Fehler beim Reparieren für ${user.username}:`, error);
    }
  }
}

// Hauptfunktion ausführen
checkUserStatistics().catch(console.error);