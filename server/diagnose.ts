/**
 * Einfaches Skript zum Ausführen der Datenbank-Diagnose und -Reparatur
 */
import { checkDataIsolation, fixDataIsolation } from './db-diagnosis';

async function run() {
  console.log("Starting database diagnosis...");
  
  // Zuerst Diagnose ausführen
  await checkDataIsolation();
  
  // Nachfrage, ob Reparatur durchgeführt werden soll
  console.log("\nMöchten Sie die Datenbankprobleme beheben? (y/n)");
  process.stdin.once('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    
    if (input === 'y' || input === 'yes') {
      console.log("Starte Datenbank-Reparatur...");
      await fixDataIsolation();
      console.log("Prozess abgeschlossen. Sie können die Anwendung jetzt neu starten.");
    } else {
      console.log("Reparatur abgebrochen.");
    }
    
    process.exit(0);
  });
}

run().catch(error => {
  console.error("Fehler bei der Ausführung:", error);
  process.exit(1);
});