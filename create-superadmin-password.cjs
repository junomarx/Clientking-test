const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const password = "demo123";
  const hashedPassword = await hashPassword(password);
  console.log(`UPDATE users SET password = '${hashedPassword}' WHERE username = 'macnphone';`);
}

main().catch(console.error);