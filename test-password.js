const { scrypt, randomBytes, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function testPassword() {
  const storedPassword = 'd6db9cfeb73f89369bfba0b09ee65dafc224ce4bdccd399148ac4be0a39a15dc98f09832b78d9ded176efa225617cd721a222a8707c5d11fbdb092fc5d773600.4f5b30a6558b12597d4b66702bb33a33';
  
  const testPasswords = ['testclient', '123456', 'admin', 'password', 'test'];
  
  for (const pwd of testPasswords) {
    const match = await comparePasswords(pwd, storedPassword);
    console.log(`Password "${pwd}": ${match ? 'MATCH' : 'NO MATCH'}`);
  }
}

testPassword().catch(console.error);