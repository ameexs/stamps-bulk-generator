/**
 * One-time setup: generate the Ed25519 signing keypair for licensing.
 *
 *   node tools/generate-keypair.js
 *
 * - tools/keys/private-key.pem  -> KEEP SECRET. Never commit or ship it.
 *                                  Back it up safely; if lost you can't issue keys,
 *                                  if leaked anyone can mint valid licenses.
 * - tools/keys/public-key.pem   -> embedded in src-main/license.js (safe to ship).
 *
 * tools/keys/ is gitignored.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'keys');
fs.mkdirSync(outDir, { recursive: true });

const privPath = path.join(outDir, 'private-key.pem');
if (fs.existsSync(privPath)) {
    console.error('A private key already exists at', privPath);
    console.error('Refusing to overwrite. Delete it manually if you really want a new keypair.');
    process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

fs.writeFileSync(privPath, privPem, { mode: 0o600 });
fs.writeFileSync(path.join(outDir, 'public-key.pem'), pubPem);

console.log('Keypair generated in tools/keys/');
console.log('\n===== PUBLIC KEY (embed in src-main/license.js) =====');
console.log(pubPem);
