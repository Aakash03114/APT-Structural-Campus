'use strict';
// Optional: create the tables up-front.  Usage:  DATABASE_URL=postgres://... npm run db:init
try { process.loadEnvFile(); } catch (_) { /* no .env */ }
const db = require('../src/db');
db.ensureSchema()
  .then(() => { console.log('Tables ready: registrations, employer_requests'); return db.getPool().end(); })
  .catch((e) => { console.error(e); process.exit(1); });
