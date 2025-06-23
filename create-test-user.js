import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';

const { Pool } = pg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const hashedPassword = await hashPassword('test123');
  
  const query = `
    INSERT INTO users (username, password, email, is_active, shop_id, is_admin, is_superadmin, pricing_plan)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (username) DO UPDATE SET
      password = EXCLUDED.password,
      email = EXCLUDED.email
    RETURNING id, username;
  `;
  
  try {
    const result = await pool.query(query, [
      'testuser',
      hashedPassword,
      'test@test.com',
      true,
      999, // unique shop_id for testing
      false,
      false,
      'basic'
    ]);
    
    console.log('Test user created/updated:', result.rows[0]);
    
    // Create business settings for the test user
    const settingsQuery = `
      INSERT INTO business_settings (
        user_id, business_name, owner_first_name, owner_last_name,
        street_address, zip_code, city, country, phone, email, shop_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        business_name = EXCLUDED.business_name
      RETURNING id;
    `;
    
    const settingsResult = await pool.query(settingsQuery, [
      result.rows[0].id,
      'Test Shop',
      'Test',
      'User',
      'Test Street 1',
      '12345',
      'Test City',
      'Germany',
      '+49123456789',
      'test@test.com',
      999
    ]);
    
    console.log('Business settings created:', settingsResult.rows[0]);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();