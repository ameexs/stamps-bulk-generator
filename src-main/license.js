/**
 * Offline license verification (Ed25519 signed keys).
 *
 * The PUBLIC key below is safe to ship. The matching PRIVATE key
 * (tools/keys/private-key.pem) stays with the vendor and is used only by
 * tools/generate-license.js to mint keys.
 *
 * Key format:  base64url(payloadJSON) "." base64url(signature)
 * payload:     { name: "<customer>", iat: <issued ms>, exp: <expiry ms> }
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEABMUf1ZSIdIo19TQPRFhiju8wgHlHWwCk2qmqel1md5g=
-----END PUBLIC KEY-----`;

let PUBLIC_KEY = null;
try {
    PUBLIC_KEY = crypto.createPublicKey(PUBLIC_KEY_PEM);
} catch (e) {
    console.error('Failed to load embedded public key:', e);
}

function b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Buffer.from(s, 'base64');
}

/**
 * Verify a license key string.
 * @returns {{valid:boolean, reason?:string, name?:string, exp?:number}}
 */
function verifyLicenseKey(key) {
    if (!key || typeof key !== 'string') return { valid: false, reason: 'No key entered' };
    if (!PUBLIC_KEY) return { valid: false, reason: 'License system error' };

    const cleaned = key.trim().replace(/\s+/g, '');
    const parts = cleaned.split('.');
    if (parts.length !== 2) return { valid: false, reason: 'This key is not in the correct format' };

    let payloadBuf, sigBuf;
    try {
        payloadBuf = b64urlDecode(parts[0]);
        sigBuf = b64urlDecode(parts[1]);
    } catch (e) {
        return { valid: false, reason: 'This key is not in the correct format' };
    }

    let signatureOk = false;
    try {
        signatureOk = crypto.verify(null, payloadBuf, PUBLIC_KEY, sigBuf);
    } catch (e) {
        return { valid: false, reason: 'Invalid key' };
    }
    if (!signatureOk) return { valid: false, reason: 'Invalid or tampered key' };

    let payload;
    try {
        payload = JSON.parse(payloadBuf.toString('utf8'));
    } catch (e) {
        return { valid: false, reason: 'This key is not in the correct format' };
    }
    if (typeof payload.exp !== 'number') return { valid: false, reason: 'This key is not in the correct format' };

    if (Date.now() > payload.exp) {
        return { valid: false, reason: 'License expired', name: payload.name, exp: payload.exp };
    }
    return { valid: true, name: payload.name, exp: payload.exp };
}

function licensePath(app) {
    return path.join(app.getPath('userData'), 'license.key');
}

function loadStoredLicense(app) {
    try {
        const p = licensePath(app);
        if (!fs.existsSync(p)) return null;
        return fs.readFileSync(p, 'utf8').trim();
    } catch (e) {
        return null;
    }
}

function saveLicense(app, key) {
    fs.writeFileSync(licensePath(app), String(key).trim(), 'utf8');
}

function clearLicense(app) {
    try { fs.unlinkSync(licensePath(app)); } catch (e) { /* ignore */ }
}

// ---- Anti clock-rollback ("high-water mark") ----
// We remember the latest time the app has ever observed. If the clock later
// appears EARLIER than that (beyond a grace window), the user likely set the
// date back to dodge expiry -> we refuse. 24h grace avoids false positives
// from legitimate minor clock corrections.
const ROLLBACK_TOLERANCE_MS = 24 * 60 * 60 * 1000;

function statePath(app) {
    return path.join(app.getPath('userData'), '.appstate');
}

function readLastSeen(app) {
    try {
        const raw = fs.readFileSync(statePath(app), 'utf8').trim();
        const obj = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        return typeof obj.t === 'number' ? obj.t : 0;
    } catch (e) {
        return 0;
    }
}

function writeLastSeen(app, t) {
    try {
        const raw = Buffer.from(JSON.stringify({ t })).toString('base64');
        fs.writeFileSync(statePath(app), raw, 'utf8');
    } catch (e) { /* ignore */ }
}

function isRolledBack(app, now) {
    return now < (readLastSeen(app) - ROLLBACK_TOLERANCE_MS);
}

// Advance the high-water mark forward (never backward).
function advanceClock(app, now) {
    if (now > readLastSeen(app)) writeLastSeen(app, now);
}

/**
 * Current activation state, derived from the stored key + clock-rollback check.
 * @returns {{activated:boolean, reason?:string, name?:string, exp?:number, hadKey:boolean}}
 */
function getState(app) {
    const stored = loadStoredLicense(app);
    if (!stored) return { activated: false, hadKey: false };

    const res = verifyLicenseKey(stored);
    const now = Date.now();

    // Rollback overrides everything — a valid-looking date means nothing if the clock moved back.
    if (isRolledBack(app, now)) {
        return { activated: false, hadKey: true, reason: 'System clock error', name: res.name, exp: res.exp };
    }

    advanceClock(app, now); // time only moves forward
    return { activated: res.valid, hadKey: true, reason: res.reason, name: res.name, exp: res.exp };
}

/**
 * Verify + store a key (used at activation). Also enforces the rollback check
 * so re-activating an expired key on a rolled-back clock can't slip through.
 * @returns {{valid:boolean, reason?:string, name?:string, exp?:number}}
 */
function activate(app, key) {
    const now = Date.now();
    if (isRolledBack(app, now)) {
        return { valid: false, reason: 'System clock error — set the correct date & time, then try again.' };
    }
    const res = verifyLicenseKey(key);
    if (res.valid) {
        saveLicense(app, key);
        advanceClock(app, now);
    }
    return res;
}

module.exports = {
    verifyLicenseKey,
    loadStoredLicense,
    saveLicense,
    clearLicense,
    licensePath,
    getState,
    activate
};
