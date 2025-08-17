// DSGVO-konformer Test: Multi-Shop Admin API
async function testMultiShopAPI() {
    console.log("🔧 Test: DSGVO-konforme Multi-Shop API");
    
    // Test 1: Multi-Shop Admin Login
    console.log("\n1. Multi-Shop Admin Login Test");
    const loginResponse = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            username: 'monking',
            password: 'monking123'
        })
    });
    
    const loginResult = await loginResponse.json();
    console.log("Login Status:", loginResponse.status);
    console.log("Login Result:", loginResult);
    
    if (loginResponse.status === 200) {
        console.log("✅ Multi-Shop Admin Login erfolgreich");
        
        // Test 2: Multi-Shop Admin Liste abrufen
        console.log("\n2. Multi-Shop Admin Liste Test");
        const adminsResponse = await fetch('http://localhost:5000/api/multi-shop/admins', {
            credentials: 'include'
        });
        
        const admins = await adminsResponse.json();
        console.log("Admins Status:", adminsResponse.status);
        console.log("Multi-Shop Admins:", admins);
        
        if (adminsResponse.status === 200) {
            console.log(`✅ ${admins.length} Multi-Shop Admins gefunden`);
            const monkingAdmin = admins.find(admin => admin.username === 'monking');
            if (monkingAdmin) {
                console.log("✅ monking ist in der Liste!");
                console.log("monking Details:", monkingAdmin);
            } else {
                console.log("❌ monking fehlt in der Liste");
            }
        } else {
            console.log("❌ Multi-Shop Admin Liste konnte nicht abgerufen werden");
        }
        
        // Test 3: Zugängliche Shops abrufen
        console.log("\n3. Zugängliche Shops Test");
        const shopsResponse = await fetch('http://localhost:5000/api/multi-shop/accessible-shops', {
            credentials: 'include'
        });
        
        const shops = await shopsResponse.json();
        console.log("Shops Status:", shopsResponse.status);
        console.log("Zugängliche Shops:", shops);
        
        if (shopsResponse.status === 200) {
            console.log(`✅ ${shops.length} zugängliche Shops gefunden`);
            
            if (shops.length > 0) {
                const firstShop = shops[0];
                console.log("Teste mit Shop:", firstShop.shopName, "(ID:", firstShop.shopId + ")");
                
                // Test 4: DSGVO-konforme Shop-spezifische Reparaturen mit Header
                console.log("\n4. DSGVO-API Header Test");
                const repairsResponse = await fetch('http://localhost:5000/api/repairs', {
                    headers: {
                        'X-Multi-Shop-Mode': 'true',
                        'X-Selected-Shop-Id': firstShop.shopId.toString()
                    },
                    credentials: 'include'
                });
                
                const repairs = await repairsResponse.json();
                console.log("Repairs Status:", repairsResponse.status);
                console.log(`Shop ${firstShop.shopId} Reparaturen:`, repairs.length);
                
                if (repairsResponse.status === 200) {
                    console.log(`✅ DSGVO-API Header funktioniert: ${repairs.length} Reparaturen geladen`);
                } else {
                    console.log("❌ DSGVO-API Header funktioniert nicht");
                }
                
                // Test 5: DSGVO-konforme Shop-spezifische Kunden mit Header
                console.log("\n5. DSGVO-API Kunden Test");
                const customersResponse = await fetch('http://localhost:5000/api/customers', {
                    headers: {
                        'X-Multi-Shop-Mode': 'true',
                        'X-Selected-Shop-Id': firstShop.shopId.toString()
                    },
                    credentials: 'include'
                });
                
                const customers = await customersResponse.json();
                console.log("Customers Status:", customersResponse.status);
                console.log(`Shop ${firstShop.shopId} Kunden:`, customers.length);
                
                if (customersResponse.status === 200) {
                    console.log(`✅ DSGVO-API Kunden Header funktioniert: ${customers.length} Kunden geladen`);
                } else {
                    console.log("❌ DSGVO-API Kunden Header funktioniert nicht");
                }
            }
        } else {
            console.log("❌ Zugängliche Shops konnten nicht abgerufen werden");
        }
        
    } else {
        console.log("❌ Multi-Shop Admin Login fehlgeschlagen");
    }
}

// Test ausführen
testMultiShopAPI().catch(console.error);