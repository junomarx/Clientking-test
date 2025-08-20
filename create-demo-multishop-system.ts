import { Client } from 'pg';
import { createHash } from 'crypto';

// Hash-Funktion für Passwörter (vereinfacht)
function hashPassword(password: string): string {
  const salt = 'demo-salt';
  return createHash('sha256').update(password + salt).digest('hex') + '.' + salt;
}

// Generiere zufällige Order-Code
function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createDemoMultiShopSystem() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Datenbankverbindung hergestellt');

    // 1. Erstelle 3 Demo-Shops
    const shops = [
      { username: 'multishop1', businessName: 'MultiShop Berlin GmbH', email: 'berlin@multishop.de' },
      { username: 'multishop2', businessName: 'MultiShop München AG', email: 'muenchen@multishop.de' },
      { username: 'multishop3', businessName: 'MultiShop Hamburg KG', email: 'hamburg@multishop.de' }
    ];

    console.log('🏪 Erstelle 3 Demo-Shops...');
    
    for (const shop of shops) {
      // Erstelle Shop-User
      const userResult = await client.query(`
        INSERT INTO users (username, password, email, "companyName", "companyAddress", 
                          "companyPhone", "companyEmail", role, "isActive") 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (username) DO UPDATE SET 
          password = EXCLUDED.password,
          email = EXCLUDED.email,
          "companyName" = EXCLUDED."companyName"
        RETURNING id, "shopId"
      `, [
        shop.username,
        hashPassword('demo123'),
        shop.email,
        shop.businessName,
        `${shop.businessName} Straße 123, 12345 ${shop.username.replace('multishop', '').replace('1', 'Berlin').replace('2', 'München').replace('3', 'Hamburg')}`,
        '+49 30 12345678',
        shop.email,
        'owner',
        true
      ]);

      const userId = userResult.rows[0].id;
      const shopId = userResult.rows[0].shopId;
      console.log(`✓ Shop ${shop.username} erstellt - User ID: ${userId}, Shop ID: ${shopId}`);

      // Erstelle Business Settings für den Shop
      await client.query(`
        INSERT INTO business_settings ("businessName", "businessAddress", "businessPhone", 
                                     "businessEmail", "businessVatNumber", "userId", "shopId")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("userId") DO UPDATE SET
          "businessName" = EXCLUDED."businessName",
          "businessAddress" = EXCLUDED."businessAddress"
      `, [
        shop.businessName,
        `${shop.businessName} Straße 123`,
        '+49 30 12345678',
        shop.email,
        `DE${Math.floor(Math.random() * 900000000 + 100000000)}`,
        userId,
        shopId
      ]);

      // 2. Erstelle 6 Musterkunden pro Shop
      const customers = [
        { firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@email.com', phone: '+49 173 1234567' },
        { firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@email.com', phone: '+49 175 2345678' },
        { firstName: 'Peter', lastName: 'Weber', email: 'peter.weber@email.com', phone: '+49 176 3456789' },
        { firstName: 'Lisa', lastName: 'Meyer', email: 'lisa.meyer@email.com', phone: '+49 177 4567890' },
        { firstName: 'Tom', lastName: 'Wagner', email: 'tom.wagner@email.com', phone: '+49 178 5678901' },
        { firstName: 'Sarah', lastName: 'Becker', email: 'sarah.becker@email.com', phone: '+49 179 6789012' }
      ];

      console.log(`👥 Erstelle ${customers.length} Kunden für ${shop.username}...`);
      
      for (const customer of customers) {
        const customerResult = await client.query(`
          INSERT INTO customers ("firstName", "lastName", email, phone, "userId", "shopId", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id
        `, [customer.firstName, customer.lastName, customer.email, customer.phone, userId, shopId]);

        const customerId = customerResult.rows[0].id;

        // 3. Erstelle 8-10 Reparaturen pro Kunde (insgesamt ca. 48-60 pro Shop)
        const repairCount = Math.floor(Math.random() * 3) + 8; // 8-10 Reparaturen
        const deviceTypes = ['iPhone', 'Samsung Galaxy', 'Huawei', 'iPad', 'MacBook', 'Surface'];
        const issues = ['Display gebrochen', 'Akku tauschen', 'Wasserschaden', 'Lautsprecher defekt', 'Kamera streikt', 'Ladebuchse kaputt'];
        const statuses = ['eingegangen', 'in_bearbeitung', 'abholbereit', 'abgeschlossen'];

        for (let i = 0; i < Math.min(repairCount, 2); i++) { // Nur 2 Reparaturen pro Kunde für Performance
          const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
          const issue = issues[Math.floor(Math.random() * issues.length)];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const orderCode = generateOrderCode();

          await client.query(`
            INSERT INTO repairs ("orderCode", "customerId", "deviceType", "deviceBrand", "deviceModel", 
                               "issueDescription", "estimatedCost", "actualCost", "status", 
                               "userId", "shopId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days', NOW())
          `, [
            orderCode,
            customerId,
            deviceType,
            deviceType.includes('iPhone') ? 'Apple' : (deviceType.includes('Samsung') ? 'Samsung' : 'Huawei'),
            deviceType,
            issue,
            Math.floor(Math.random() * 200 + 50), // 50-250€
            Math.floor(Math.random() * 200 + 50),
            status,
            userId,
            shopId
          ]);
        }
      }

      console.log(`✓ Kunden und Reparaturen für ${shop.username} erstellt`);
    }

    // 4. Erstelle Multi-Shop Admin Benutzer
    console.log('👨‍💼 Erstelle Multi-Shop Admin...');
    
    const adminResult = await client.query(`
      INSERT INTO users (username, password, email, "isMultiShopAdmin", role, "isActive")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET 
        "isMultiShopAdmin" = EXCLUDED."isMultiShopAdmin",
        password = EXCLUDED.password
      RETURNING id
    `, [
      'multishop-admin',
      hashPassword('admin123'),
      'office@clientking.at',
      true,
      'admin',
      true
    ]);

    const adminId = adminResult.rows[0].id;
    console.log(`✓ Multi-Shop Admin erstellt - ID: ${adminId}`);

    // 5. Hole alle Shop-IDs und weise dem Multi-Shop Admin zu
    console.log('🔗 Weise Shops dem Multi-Shop Admin zu...');
    
    const shopsResult = await client.query(`
      SELECT id, "shopId", username FROM users WHERE username IN ('multishop1', 'multishop2', 'multishop3')
    `);

    for (const shopUser of shopsResult.rows) {
      // Erstelle Multi-Shop Admin Zuweisung als "approved" (bereits genehmigt)
      await client.query(`
        INSERT INTO user_shop_access ("userId", "multiShopAdminId", "shopId", status, "requestReason", "grantedAt")
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT ("userId", "multiShopAdminId", "shopId") DO UPDATE SET
          status = EXCLUDED.status,
          "grantedAt" = EXCLUDED."grantedAt"
      `, [
        shopUser.id,
        adminId,
        shopUser.shopId,
        'approved',
        'Demo-System Setup - Automatische Zuweisung für Testzwecke'
      ]);

      console.log(`✓ Shop ${shopUser.username} (Shop-ID: ${shopUser.shopId}) dem Multi-Shop Admin zugewiesen`);
    }

    // 6. Erstelle Audit Log Einträge
    console.log('📝 Erstelle Audit Log Einträge...');
    
    await client.query(`
      INSERT INTO audit_logs (action, "userId", "shopId", details, "ipAddress")
      VALUES 
        ('DEMO_SYSTEM_CREATED', $1, NULL, 'Demo Multi-Shop System mit 3 Shops erstellt', '127.0.0.1'),
        ('MULTI_SHOP_ADMIN_ASSIGNED', $1, NULL, 'Multi-Shop Admin office@clientking.at allen Demo-Shops zugewiesen', '127.0.0.1')
    `, [adminId]);

    console.log('\n🎉 Demo Multi-Shop System erfolgreich erstellt!');
    console.log('\n📊 Übersicht:');
    console.log('• 3 Demo-Shops: multishop1, multishop2, multishop3');
    console.log('• Je 6 Kunden pro Shop');
    console.log('• Je ca. 12 Reparaturen pro Shop');
    console.log('• 1 Multi-Shop Admin: office@clientking.at');
    console.log('• Alle Zugriffe bereits genehmigt');
    
    console.log('\n🔐 Login-Daten:');
    console.log('Shop 1: multishop1 / demo123');
    console.log('Shop 2: multishop2 / demo123');
    console.log('Shop 3: multishop3 / demo123');
    console.log('Multi-Shop Admin: office@clientking.at / admin123');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Demo-Systems:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Script ausführen
createDemoMultiShopSystem().catch(console.error);