const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'report.json');

// ----- Base path (optional sub-path hosting) -----
// The site can live under a sub-path, e.g. https://host/Research-IITB/.
// Set BASE_PATH=/Research-IITB in backend/.env (or the process env) and build
// the front-end with VITE_BASE=/Research-IITB/ so both halves agree.
// Default '/' keeps the usual domain-root deployment.
function readEnvFile() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return {};
  const out = {};
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
  return out;
}
const FILE_ENV = readEnvFile();
const BASE_PATH = ((process.env.BASE_PATH || FILE_ENV.BASE_PATH || '/').trim() || '/')
  .replace(/\/+$/, '') || '/';

// ----- Admin token -----
// Priority: process env ADMIN_TOKEN -> backend/.env (ADMIN_TOKEN=...) -> backend/.admin-token (auto-created)
function loadAdminToken() {
  if (process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.trim()) {
    return { token: process.env.ADMIN_TOKEN.trim(), source: 'environment variable' };
  }
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^\s*ADMIN_TOKEN\s*=\s*(.+?)\s*$/m);
    if (m) return { token: m[1].replace(/^["']|["']$/g, ''), source: 'backend/.env' };
  }
  const tokenFile = path.join(__dirname, '.admin-token');
  if (fs.existsSync(tokenFile)) {
    const t = fs.readFileSync(tokenFile, 'utf8').trim();
    if (t) return { token: t, source: 'backend/.admin-token' };
  }
  const generated = crypto.randomBytes(24).toString('hex');
  try { fs.writeFileSync(tokenFile, generated + '\n'); } catch { /* keep in memory */ }
  return { token: generated, source: 'auto-generated (saved to backend/.admin-token)' };
}

const { token: ADMIN_TOKEN, source: TOKEN_SOURCE } = loadAdminToken();

function requireAdmin(req, res, next) {
  const provided = String(req.headers['x-admin-token'] || '').trim()
    || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_TOKEN);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    return res.status(401).json({
      error: 'Admin token required or invalid - enter it on the Update Data page.'
    });
  }
  next();
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Answer API calls made under the base path as well
// (front-end built with VITE_API_BASE=/Research-IITB/api), so no proxy has to
// strip the prefix. Requests for the site itself are left untouched.
if (BASE_PATH !== '/') {
  app.use((req, _res, next) => {
    if (req.path === `${BASE_PATH}/api` || req.path.startsWith(`${BASE_PATH}/api/`)) {
      req.url = req.url.slice(BASE_PATH.length) || '/';
    }
    next();
  });
}

async function readData() {
  return fs.readJson(DATA_FILE);
}

async function writeData(data) {
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
}

// Full report
app.get('/api/report', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read report data', details: err.message });
  }
});

// Single top-level section
app.get('/api/report/:section', async (req, res) => {
  try {
    const data = await readData();
    const section = data[req.params.section];
    if (section === undefined) {
      return res.status(404).json({ error: `Section '${req.params.section}' not found` });
    }
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read section', details: err.message });
  }
});

// Verify an admin token without changing any data
app.post('/api/auth/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

// Replace a top-level section (dynamic update)
app.put('/api/report/:section', requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    data[req.params.section] = req.body;
    await writeData(data);
    res.json({ success: true, section: req.params.section });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section', details: err.message });
  }
});

// Merge fields into a top-level section (partial update)
app.patch('/api/report/:section', requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    const current = data[req.params.section];
    if (current === undefined) {
      return res.status(404).json({ error: `Section '${req.params.section}' not found` });
    }
    if (Array.isArray(current) && Array.isArray(req.body)) {
      data[req.params.section] = req.body;
    } else if (typeof current === 'object' && current !== null) {
      data[req.params.section] = { ...current, ...req.body };
    } else {
      data[req.params.section] = req.body;
    }
    await writeData(data);
    res.json({ success: true, section: req.params.section });
  } catch (err) {
    res.status(500).json({ error: 'Failed to patch section', details: err.message });
  }
});

// Upload a full replacement report
app.post('/api/report', requireAdmin, async (req, res) => {
  try {
    await writeData(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to replace report data', details: err.message });
  }
});

// Restore original data from backup file if present
app.post('/api/report/reset', requireAdmin, async (req, res) => {
  try {
    const backup = path.join(__dirname, 'data', 'report.backup.json');
    if (!(await fs.pathExists(backup))) {
      return res.status(404).json({ error: 'No backup file found' });
    }
    const data = await fs.readJson(backup);
    await writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset', details: err.message });
  }
});

// Serve frontend build if present
const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendBuild)) {
  if (BASE_PATH === '/') {
    app.use(express.static(frontendBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuild, 'index.html'));
    });
  } else {
    // Sub-path hosting: the build's asset URLs are prefixed with BASE_PATH, so a
    // copy at the domain root would load HTML with broken assets. Only mount it
    // under the base path and answer everything else with 404.
    app.use(BASE_PATH, express.static(frontendBuild));
    app.get([BASE_PATH, `${BASE_PATH}/*`], (req, res) => {
      res.sendFile(path.join(frontendBuild, 'index.html'));
    });
    app.use((req, res) => {
      res.status(404).send('Not found');
    });
  }
}

app.listen(PORT, () => {
  console.log(`IITB Research Portal API running on port ${PORT}`);
  console.log(`Base path: ${BASE_PATH}`);
  console.log(`Write endpoints protected; admin token source: ${TOKEN_SOURCE}`);
  if (TOKEN_SOURCE.startsWith('auto-generated')) {
    console.log(`Admin token: ${ADMIN_TOKEN}`);
  }
});
