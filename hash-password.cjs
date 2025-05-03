const { scrypt, randomBytes } = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function run() {
  const password = 'demo1234';
  const hashed = await hashPassword(password);
  console.log('Neues Passwort:', password);
  console.log('Gehashtes Passwort:', hashed);
}

run();
