'use strict';
/**
 * Local entry point:  npm start  /  npm run dev
 * (On Vercel the app is exposed through api/index.js instead.)
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '.env');

/** Minimal .env parser used as a fallback on Node versions without process.loadEnvFile(). */
function loadEnvFallback(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value; // real env vars always win
  }
}

if (fs.existsSync(ENV_PATH)) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(ENV_PATH); // explicit path: works regardless of the current working directory
    } else {
      loadEnvFallback(ENV_PATH); // Node version too old to have loadEnvFile
    }
    console.log(`Loaded environment variables from ${ENV_PATH}`);
  } catch (err) {
    console.error(`Found ${ENV_PATH} but failed to load it:`, err.message);
  }
} else {
  console.warn(`No .env file found at ${ENV_PATH} - relying on variables already set in the environment.`);
}

const app = require('./src/app');

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`APT Structural Campus running on http://localhost:${port}`));
}
