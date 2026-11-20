'use strict';
/**
 * PostgreSQL access (replaces Flask-SQLAlchemy + SQLite).
 * Vercel's filesystem is read-only/ephemeral, so registrations and employer requests are stored in a
 * hosted Postgres database (Neon / Vercel Postgres / Supabase / any Postgres) given by DATABASE_URL.
 */
const { Pool, types } = require('pg');
const config = require('./config');
const { PyDateTime } = require('./lib/pydate');

// Return TIMESTAMP (without tz) columns as raw text so we can format them like Python's datetime.
types.setTypeParser(1114, (v) => v);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS registrations (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(120) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  course        VARCHAR(100) NOT NULL,
  qualification VARCHAR(100),
  message       TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);
CREATE TABLE IF NOT EXISTS employer_requests (
  id                 SERIAL PRIMARY KEY,
  company_name       VARCHAR(200) NOT NULL,
  contact_person     VARCHAR(200) NOT NULL,
  email              VARCHAR(200) NOT NULL,
  phone              VARCHAR(50)  NOT NULL,
  location           VARCHAR(200) NOT NULL,
  position           VARCHAR(200) NOT NULL,
  employees_required INTEGER      NOT NULL,
  experience         VARCHAR(200),
  employment_type    VARCHAR(100),
  skills             TEXT,
  job_description    TEXT,
  additional_message TEXT,
  created_at         TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);`;

let pool;
let schemaReady;

function getPool() {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add a Postgres connection string to the environment variables.');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: parseInt(process.env.PG_POOL_MAX || '3', 10),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
    pool.on('error', (err) => console.error('PG POOL ERROR:', err.message));
  }
  return pool;
}

/** Equivalent of `db.create_all()`; runs once per server instance. */
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query('SELECT pg_advisory_lock(7351001)'); // serialise concurrent cold starts
        await client.query(SCHEMA_SQL);
      } finally {
        try { await client.query('SELECT pg_advisory_unlock(7351001)'); } catch (_) { /* ignore */ }
        client.release();
      }
    })().catch((err) => { schemaReady = undefined; throw err; });
  }
  return schemaReady;
}

const wrap = (row) => (row ? { ...row, created_at: row.created_at ? new PyDateTime(row.created_at) : null } : row);

async function createRegistration(r) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO registrations (full_name, email, phone, course, qualification, message)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [r.full_name, r.email, r.phone, r.course, r.qualification, r.message]
  );
  return wrap(rows[0]);
}

async function createEmployerRequest(r) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO employer_requests
       (company_name, contact_person, email, phone, location, position, employees_required,
        experience, employment_type, skills, job_description, additional_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [r.company_name, r.contact_person, r.email, r.phone, r.location, r.position, r.employees_required,
      r.experience, r.employment_type, r.skills, r.job_description, r.additional_message]
  );
  return wrap(rows[0]);
}

async function listRegistrations() {
  await ensureSchema();
  const { rows } = await getPool().query('SELECT * FROM registrations ORDER BY created_at DESC, id DESC');
  return rows.map(wrap);
}

async function listEmployerRequests() {
  await ensureSchema();
  const { rows } = await getPool().query('SELECT * FROM employer_requests ORDER BY created_at DESC, id DESC');
  return rows.map(wrap);
}

module.exports = {
  ensureSchema, createRegistration, createEmployerRequest, listRegistrations, listEmployerRequests,
  SCHEMA_SQL, getPool,
};
