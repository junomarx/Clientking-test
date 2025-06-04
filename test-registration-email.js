/**
 * Test-Skript für die E-Mail-Benachrichtigung bei neuer Benutzerregistrierung
 */

async function testRegistrationNotification() {
  try {
    console.log('Teste Registrierungsbenachrichtigung...');
    
    // Simuliere eine POST-Anfrage an das Register-Endpoint
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser_email_' + Date.now(),
        email: 'testuser@example.com',
        password: 'TestPassword123!',
        companyName: 'Test E-Mail Handyshop',
        streetAddress: 'Teststraße 456',
        city: 'Wien',
        zipCode: '1020',
        country: 'Österreich',
        phone: '+43 1 9876543',
        companyPhone: '+43 1 9876543',
        ownerFirstName: 'Max',
        ownerLastName: 'Mustermann',
        taxId: 'ATU12345678',
        website: 'https://test-handyshop.at'
      })
    });
    
    const result = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 201) {
      console.log('✅ Registrierung erfolgreich - E-Mail sollte an bugi3000@gmail.com gesendet worden sein');
    } else {
      console.log('❌ Registrierung fehlgeschlagen');
    }
    
  } catch (error) {
    console.error('Fehler beim Test:', error);
  }
}

testRegistrationNotification();