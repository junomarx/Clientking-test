// Testdatei für API-Aufruf
const fetchData = async () => {
  try {
    const response = await fetch('/api/cost-estimates');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('API-Antwort:', data);
    // Untersuche spezifisch die Kundendaten
    if (data && data.length > 0) {
      data.forEach((item, index) => {
        console.log(`\nEintrag #${index + 1} (${item.reference_number})`);
        console.log('Kundendaten:', {
          firstname: item.firstname,
          lastname: item.lastname,
          email: item.email
        });
      });
    }
  } catch (error) {
    console.error('Fehler beim API-Aufruf:', error);
  }
};

// Beim Laden ausführen
fetchData();