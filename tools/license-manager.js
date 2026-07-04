/**
 * STAMPS Bulk Generator — License Manager (VENDOR TOOL — do not ship!)
 *
 * A local web interface for minting and tracking customer license keys.
 * Zero dependencies: Node's http + crypto + fs only.
 *
 *   Start:  npm run licenses       (or: node tools/license-manager.js)
 *   Open:   http://localhost:4600
 *
 * - Signs keys with tools/keys/private-key.pem (same as generate-license.js).
 * - Stores records in tools/data/licenses.json (gitignored — contains
 *   customer names and keys; back it up together with the private key).
 * - Binds to 127.0.0.1 only.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 4600;
const HOST = '127.0.0.1';

const KEYS_DIR = path.join(__dirname, 'keys');
const PRIV_PATH = path.join(KEYS_DIR, 'private-key.pem');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'licenses.json');

/* ---------------- signing ---------------- */
let privateKey = null;
function loadPrivateKey() {
    if (!fs.existsSync(PRIV_PATH)) return null;
    return crypto.createPrivateKey(fs.readFileSync(PRIV_PATH));
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function signLicense(name, expMs) {
    const payload = { name: String(name), iat: Date.now(), exp: expMs };
    const payloadBuf = Buffer.from(JSON.stringify(payload), 'utf8');
    const sig = crypto.sign(null, payloadBuf, privateKey);
    return { key: b64url(payloadBuf) + '.' + b64url(sig), iat: payload.iat, exp: payload.exp };
}

/* ---------------- tiny JSON "database" ---------------- */
function loadDb() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        return { licenses: [] };
    }
}

// Atomic write: temp file + rename, so a crash can't corrupt the DB.
function saveDb(db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
}

/* ---------------- request helpers ---------------- */
function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (c) => {
            data += c;
            if (data.length > 1e6) { reject(new Error('body too large')); req.destroy(); }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function json(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
}

/* ---------------- server ---------------- */
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(PAGE);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/licenses') {
            const db = loadDb();
            const licenses = [...db.licenses].sort((a, b) => (b.iat || 0) - (a.iat || 0));
            json(res, 200, { licenses, hasPrivateKey: !!privateKey });
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/licenses') {
            if (!privateKey) { json(res, 500, { error: 'Private key missing at tools/keys/private-key.pem' }); return; }

            const body = JSON.parse((await readBody(req)) || '{}');
            const name = String(body.name || '').trim();
            if (!name) { json(res, 400, { error: 'Customer name is required' }); return; }

            let expMs;
            if (body.expiry) {
                expMs = new Date(body.expiry + 'T23:59:59').getTime();
            } else {
                const days = parseInt(body.days, 10);
                if (!days || days < 1 || days > 3650) { json(res, 400, { error: 'Days must be between 1 and 3650' }); return; }
                expMs = Date.now() + days * 24 * 60 * 60 * 1000;
            }
            if (isNaN(expMs)) { json(res, 400, { error: 'Invalid expiry date' }); return; }

            const signed = signLicense(name, expMs);
            const record = {
                id: 'lic_' + crypto.randomBytes(6).toString('hex'),
                name,
                note: String(body.note || '').trim(),
                kind: String(body.kind || 'custom'),
                iat: signed.iat,
                exp: signed.exp,
                key: signed.key,
                createdAt: new Date().toISOString()
            };

            const db = loadDb();
            db.licenses.push(record);
            saveDb(db);
            json(res, 200, { license: record });
            return;
        }

        const delMatch = url.pathname.match(/^\/api\/licenses\/(lic_[a-f0-9]+)$/);
        if (req.method === 'DELETE' && delMatch) {
            const db = loadDb();
            const before = db.licenses.length;
            db.licenses = db.licenses.filter((l) => l.id !== delMatch[1]);
            if (db.licenses.length === before) { json(res, 404, { error: 'Not found' }); return; }
            saveDb(db);
            json(res, 200, { ok: true });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    } catch (e) {
        json(res, 500, { error: e.message });
    }
});

/* ---------------- UI (single page, matches app/site identity) ---------------- */
const PAGE = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>License Manager — STAMPS Bulk Generator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#0a0c11;--surface:#10131a;--surface-2:#151924;
  --line:rgba(233,235,241,.08);--line-strong:rgba(233,235,241,.16);
  --text:#e9ebf1;--text-2:#a3abbd;--text-3:#6e7787;
  --accent:#8b96f8;--accent-soft:rgba(139,150,248,.12);
  --gold:#d8b36a;--green:#3ecf8e;--red:#ef6a6a;--amber:#f0b45c;
  --serif:'Fraunces',Georgia,serif;--sans:'Inter',sans-serif;--mono:'IBM Plex Mono',monospace;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--sans);background:var(--ink);color:var(--text);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
::selection{background:var(--accent);color:var(--ink)}
.wrap{max-width:1060px;margin:0 auto;padding:36px 28px 80px}
.masthead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line-strong);padding-bottom:22px;margin-bottom:34px;flex-wrap:wrap}
.masthead h1{font-family:var(--serif);font-weight:500;font-size:30px;letter-spacing:-.01em}
.masthead h1 em{font-style:italic;color:var(--accent)}
.masthead .tag{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--gold)}
.warn{background:rgba(239,106,106,.09);border:1px solid rgba(239,106,106,.35);color:var(--red);border-radius:10px;padding:12px 16px;margin-bottom:24px;font-size:13px;display:none}
.grid{display:grid;grid-template-columns:340px 1fr;gap:28px;align-items:start}
.card{background:var(--surface);border:1px solid var(--line-strong);border-radius:14px;padding:26px}
.card h2{font-family:var(--serif);font-weight:500;font-size:19px;margin-bottom:18px;letter-spacing:-.01em}
label{display:block;font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--gold);margin:0 0 7px}
input[type=text],input[type=number],input[type=date]{width:100%;background:var(--ink);border:1px solid var(--line);border-radius:9px;color:var(--text);padding:10px 13px;font-family:var(--sans);font-size:13.5px;transition:border-color .15s,box-shadow .15s;color-scheme:dark}
input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
input::placeholder{color:var(--text-3)}
.field{margin-bottom:16px}
.kinds{display:flex;gap:8px;margin-bottom:16px}
.kind{flex:1;border:1px solid var(--line);border-radius:9px;padding:9px 6px;text-align:center;cursor:pointer;font-size:12.5px;color:var(--text-2);transition:all .15s;user-select:none}
.kind small{display:block;font-family:var(--mono);font-size:9.5px;color:var(--text-3);margin-top:1px}
.kind.sel{border-color:var(--accent);background:var(--accent-soft);color:var(--text)}
.kind.sel small{color:var(--accent)}
.custom-row{display:none;gap:10px}
.custom-row.show{display:flex}
.custom-row>div{flex:1}
button.primary{width:100%;margin-top:6px;padding:12px;border:none;border-radius:9px;background:var(--text);color:var(--ink);font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
button.primary:hover:not(:disabled){background:#fff;transform:translateY(-1px);box-shadow:0 8px 24px rgba(233,235,241,.12)}
button.primary:disabled{opacity:.5;cursor:default}
.result{display:none;margin-top:18px;border-top:1px solid var(--line);padding-top:16px}
.result.show{display:block}
.result .rname{font-size:13px;color:var(--text-2);margin-bottom:8px}
.result .rname strong{color:var(--text)}
.keybox{background:var(--ink);border:1px solid var(--line-strong);border-radius:9px;padding:11px 12px;font-family:var(--mono);font-size:10.5px;line-height:1.6;word-break:break-all;color:var(--text-2);max-height:90px;overflow:auto}
.copy-btn{margin-top:10px;width:100%;padding:9px;border:1px solid var(--line-strong);background:transparent;color:var(--text);border-radius:8px;font-family:var(--sans);font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s}
.copy-btn:hover{border-color:var(--text-3)}
.copy-btn.copied{border-color:rgba(62,207,142,.5);color:var(--green)}
.facts{display:flex;border-top:1px solid var(--line-strong);margin-bottom:22px}
.fact{flex:1;padding:14px 18px 12px 0}
.fact+.fact{border-left:1px solid var(--line);padding-left:18px}
.fact b{display:block;font-family:var(--mono);font-weight:500;font-size:19px}
.fact span{font-size:11px;color:var(--text-3)}
.fact.green b{color:var(--green)}.fact.amber b{color:var(--amber)}.fact.red b{color:var(--red)}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}
.toolbar input{max-width:260px}
.count{font-family:var(--mono);font-size:11px;color:var(--text-3)}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--line-strong);border-radius:14px;overflow:hidden}
.tbl-wrap{border:1px solid var(--line-strong);border-radius:14px;overflow:hidden}
.tbl-wrap table{border:none}
th{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);text-align:left;padding:11px 14px;border-bottom:1px solid var(--line-strong);background:var(--surface-2);font-weight:500}
td{padding:11px 14px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--text-2);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.015)}
td .cname{color:var(--text);font-weight:500}
td .cnote{display:block;font-size:11px;color:var(--text-3)}
.mono{font-family:var(--mono);font-size:11px}
.badge{display:inline-block;font-family:var(--mono);font-size:10px;padding:2px 9px;border-radius:100px;border:1px solid}
.badge.active{color:var(--green);border-color:rgba(62,207,142,.4);background:rgba(62,207,142,.07)}
.badge.expiring{color:var(--amber);border-color:rgba(240,180,92,.4);background:rgba(240,180,92,.07)}
.badge.expired{color:var(--red);border-color:rgba(239,106,106,.4);background:rgba(239,106,106,.07)}
.badge.trial{color:var(--accent);border-color:rgba(139,150,248,.4);background:var(--accent-soft)}
.rowbtn{border:1px solid var(--line-strong);background:transparent;color:var(--text-2);border-radius:7px;padding:5px 11px;font-family:var(--sans);font-size:11.5px;cursor:pointer;transition:all .15s;margin-right:6px}
.rowbtn:hover{color:var(--text);border-color:var(--text-3)}
.rowbtn.danger:hover{color:var(--red);border-color:rgba(239,106,106,.5)}
.rowbtn.copied{color:var(--green);border-color:rgba(62,207,142,.5)}
.empty{padding:36px;text-align:center;color:var(--text-3);font-size:13px}
footer{margin-top:30px;font-family:var(--mono);font-size:10px;color:var(--text-3);letter-spacing:.03em}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <div class="masthead">
    <h1>License <em>Manager</em>.</h1>
    <span class="tag">Vendor tool · localhost only · do not ship</span>
  </div>

  <div class="warn" id="warn"></div>

  <div class="grid">
    <div class="card">
      <h2>Issue a key</h2>
      <div class="field">
        <label for="name">Customer name</label>
        <input type="text" id="name" placeholder="e.g. Tetuan Rahman & Co" autofocus>
      </div>
      <div class="field">
        <label for="note">Note <span style="color:var(--text-3);text-transform:none;letter-spacing:0">— email / phone / price paid (optional)</span></label>
        <input type="text" id="note" placeholder="maria@firm.my · RM390 early-tester">
      </div>
      <label>License type</label>
      <div class="kinds">
        <div class="kind" data-kind="trial" data-days="14">Trial<small>14 days</small></div>
        <div class="kind sel" data-kind="annual" data-days="365">Annual<small>365 days</small></div>
        <div class="kind" data-kind="custom">Custom<small>days / date</small></div>
      </div>
      <div class="custom-row" id="customRow">
        <div class="field">
          <label for="days">Days</label>
          <input type="number" id="days" min="1" max="3650" placeholder="30">
        </div>
        <div class="field">
          <label for="expiry">…or exact expiry</label>
          <input type="date" id="expiry">
        </div>
      </div>
      <button class="primary" id="genBtn">Generate key</button>

      <div class="result" id="result">
        <p class="rname">Key for <strong id="rName"></strong> · expires <strong id="rExp"></strong></p>
        <div class="keybox" id="rKey"></div>
        <button class="copy-btn" id="rCopy">Copy key to clipboard</button>
      </div>
    </div>

    <div>
      <div class="facts" id="facts"></div>
      <div class="toolbar">
        <input type="text" id="search" placeholder="Search customers…">
        <span class="count" id="count"></span>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr><th>Customer</th><th>Type</th><th>Issued</th><th>Expires</th><th>Status</th><th style="width:190px">Actions</th></tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <footer>DB: tools/data/licenses.json · signing key: tools/keys/private-key.pem — back both up.</footer>
    </div>
  </div>
</div>

<script>
let LICENSES = [];
let kind = 'annual', days = 365;

const $ = (id) => document.getElementById(id);
const fmt = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const DAY = 24 * 60 * 60 * 1000;

function status(l) {
  const left = l.exp - Date.now();
  if (left < 0) return { cls: 'expired', label: 'Expired' };
  if (left <= 14 * DAY) return { cls: 'expiring', label: Math.ceil(left / DAY) + 'd left' };
  return { cls: 'active', label: 'Active' };
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function render() {
  const q = $('search').value.trim().toLowerCase();
  const list = LICENSES.filter(l => !q || l.name.toLowerCase().includes(q) || (l.note || '').toLowerCase().includes(q));

  const counts = { active: 0, expiring: 0, expired: 0 };
  LICENSES.forEach(l => { counts[status(l).cls === 'expiring' ? 'expiring' : status(l).cls]++; });

  $('facts').innerHTML =
    '<div class="fact"><b>' + LICENSES.length + '</b><span>keys issued</span></div>' +
    '<div class="fact green"><b>' + counts.active + '</b><span>active</span></div>' +
    '<div class="fact amber"><b>' + counts.expiring + '</b><span>expiring ≤14d</span></div>' +
    '<div class="fact red"><b>' + counts.expired + '</b><span>expired</span></div>';

  $('count').textContent = list.length + ' shown';

  if (!list.length) {
    $('rows').innerHTML = '<tr><td colspan="6"><div class="empty">No licenses' + (q ? ' match "' + esc(q) + '"' : ' yet — issue your first key on the left') + '.</div></td></tr>';
    return;
  }

  $('rows').innerHTML = list.map(l => {
    const s = status(l);
    const kindBadge = l.kind === 'trial' ? '<span class="badge trial">trial</span>' : '<span class="mono">' + esc(l.kind) + '</span>';
    return '<tr>' +
      '<td><span class="cname">' + esc(l.name) + '</span>' + (l.note ? '<span class="cnote">' + esc(l.note) + '</span>' : '') + '</td>' +
      '<td>' + kindBadge + '</td>' +
      '<td class="mono">' + fmt(l.iat) + '</td>' +
      '<td class="mono">' + fmt(l.exp) + '</td>' +
      '<td><span class="badge ' + s.cls + '">' + s.label + '</span></td>' +
      '<td>' +
        '<button class="rowbtn" onclick="copyKey(this,\\'' + l.id + '\\')">Copy key</button>' +
        '<button class="rowbtn" onclick="renew(\\'' + l.id + '\\')">Renew</button>' +
        '<button class="rowbtn danger" onclick="del(\\'' + l.id + '\\')">✕</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

async function load() {
  const r = await fetch('/api/licenses').then(r => r.json());
  LICENSES = r.licenses || [];
  if (!r.hasPrivateKey) {
    $('warn').style.display = 'block';
    $('warn').textContent = 'Private key not found at tools/keys/private-key.pem — key generation is disabled. Run: node tools/generate-keypair.js (or restore your backup).';
    $('genBtn').disabled = true;
  }
  render();
}

document.querySelectorAll('.kind').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.kind').forEach(k => k.classList.remove('sel'));
    el.classList.add('sel');
    kind = el.dataset.kind;
    days = parseInt(el.dataset.days || '0', 10);
    $('customRow').classList.toggle('show', kind === 'custom');
  });
});

$('genBtn').addEventListener('click', async () => {
  const name = $('name').value.trim();
  if (!name) { $('name').focus(); return; }

  const body = { name, note: $('note').value.trim(), kind };
  if (kind === 'custom') {
    const expiry = $('expiry').value;
    const d = parseInt($('days').value, 10);
    if (expiry) body.expiry = expiry;
    else if (d) body.days = d;
    else { $('days').focus(); return; }
  } else {
    body.days = days;
  }

  $('genBtn').disabled = true;
  $('genBtn').textContent = 'Signing…';
  try {
    const r = await fetch('/api/licenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    LICENSES.unshift(data.license);
    $('rName').textContent = data.license.name;
    $('rExp').textContent = fmt(data.license.exp);
    $('rKey').textContent = data.license.key;
    $('result').classList.add('show');
    $('rCopy').classList.remove('copied');
    $('rCopy').textContent = 'Copy key to clipboard';
    $('name').value = ''; $('note').value = '';
    render();
  } catch (e) {
    alert(e.message);
  } finally {
    $('genBtn').disabled = false;
    $('genBtn').textContent = 'Generate key';
  }
});

$('rCopy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('rKey').textContent);
  $('rCopy').classList.add('copied');
  $('rCopy').textContent = '✓ Copied';
});

window.copyKey = async (btn, id) => {
  const l = LICENSES.find(x => x.id === id);
  if (!l) return;
  await navigator.clipboard.writeText(l.key);
  btn.classList.add('copied');
  btn.textContent = '✓ Copied';
  setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'Copy key'; }, 1800);
};

window.renew = (id) => {
  const l = LICENSES.find(x => x.id === id);
  if (!l) return;
  $('name').value = l.name;
  $('note').value = l.note || '';
  document.querySelector('.kind[data-kind="annual"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('name').focus();
};

window.del = async (id) => {
  const l = LICENSES.find(x => x.id === id);
  if (!l) return;
  if (!confirm('Delete the record for "' + l.name + '"?\\n\\nThis only removes it from your tracking database — an already-issued key keeps working until it expires.')) return;
  const r = await fetch('/api/licenses/' + id, { method: 'DELETE' });
  if (r.ok) { LICENSES = LICENSES.filter(x => x.id !== id); render(); }
};

$('search').addEventListener('input', render);
load();
</script>
</body>
</html>`;

/* ---------------- start ---------------- */
privateKey = loadPrivateKey();
if (!privateKey) {
    console.warn('\n[!] Private key not found at', PRIV_PATH);
    console.warn('    Key generation will be disabled until it exists.\n');
}

server.listen(PORT, HOST, () => {
    console.log('\nSTAMPS License Manager (vendor tool)');
    console.log('  UI:  http://localhost:' + PORT);
    console.log('  DB:  ' + DB_PATH);
    console.log('\nPress Ctrl+C to stop.');
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('Port ' + PORT + ' is already in use — is the License Manager already running?');
        process.exit(1);
    }
    throw e;
});
