/**
 * Mint a signed annual license key for a customer.
 *
 *   node tools/generate-license.js --name "ABC Sdn Bhd" --days 365
 *   node tools/generate-license.js --name "ABC Sdn Bhd" --expiry 2027-06-27
 *
 * --name    Customer / company name (shown in the app). Required.
 * --days    License length in days (default 365).
 * --expiry  Explicit expiry date YYYY-MM-DD (overrides --days).
 *
 * Send the printed key to the customer; they paste it into the app's
 * activation screen on first run.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const privPath = path.join(__dirname, 'keys', 'private-key.pem');
if (!fs.existsSync(privPath)) {
    console.error('Missing private key at', privPath);
    console.error('Run once first:  node tools/generate-keypair.js');
    process.exit(1);
}
const privateKey = crypto.createPrivateKey(fs.readFileSync(privPath));

// Parse --flag value args
const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1]; i++; }
}

const name = args.name;
if (!name) {
    console.error('Usage: node tools/generate-license.js --name "Customer" [--days 365 | --expiry YYYY-MM-DD]');
    process.exit(1);
}

let exp;
if (args.expiry) {
    exp = new Date(args.expiry + 'T23:59:59').getTime();
} else {
    const days = parseInt(args.days || '365', 10);
    exp = Date.now() + days * 24 * 60 * 60 * 1000;
}
if (isNaN(exp)) {
    console.error('Invalid expiry date. Use --expiry YYYY-MM-DD or --days N');
    process.exit(1);
}

const payload = { name: String(name), iat: Date.now(), exp };
const payloadBuf = Buffer.from(JSON.stringify(payload), 'utf8');
const sig = crypto.sign(null, payloadBuf, privateKey);

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const key = b64url(payloadBuf) + '.' + b64url(sig);

console.log('\nCustomer : ' + name);
console.log('Expires  : ' + new Date(exp).toLocaleDateString() + '  (' + new Date(exp).toISOString() + ')');
console.log('\n===== LICENSE KEY (send to customer) =====\n');
console.log(key);
console.log('');
