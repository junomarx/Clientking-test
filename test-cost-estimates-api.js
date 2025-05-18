// Einfaches Testskript, um die API-Antwort zu prüfen
const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Cookie aus der Anmeldung einfügen
    const response = await fetch('http://localhost:3000/api/cost-estimates', {
      headers: {
        'Cookie': 'connect.sid=s%3AJUZCkJJRe1YDGu4xOjJTu9nqcSHFG6aP.I6WMvZOLXmDcnSsm8QBgc3Mof%2BgL3%2FZ5G0wjJ0eZ%2Foo'
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP-Fehler: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    
    // Prüfen, ob Kundendaten enthalten sind
    if (data && data.length > 0) {
      console.log('\nKundendaten-Prüfung:');
      data.forEach((item, index) => {
        console.log(`\nEintrag #${index + 1} (${item.reference_number}):`);
        console.log(`- firstname: ${item.firstname || 'FEHLT'}`);
        console.log(`- lastname: ${item.lastname || 'FEHLT'}`);
        console.log(`- email: ${item.email || 'FEHLT'}`);
        console.log(`- customer_id: ${item.customer_id || 'FEHLT'}`);
      });
    }
  } catch (error) {
    console.error('Fehler beim API-Aufruf:', error);
  }
}

testAPI();