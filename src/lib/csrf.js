'use strict';
/**
 * CSRF protection equivalent to Flask-WTF's CSRFProtect (session token + signed, time-limited
 * form token, SSL referrer check). Stateless: the session lives in a signed cookie, so it works
 * across Vercel serverless instances.
 */
const crypto = require('crypto');
const config = require('../config');

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', config.SECRET_KEY).update('wtf-csrf-token:' + data).digest('base64url');

function generateToken(req) {
  if (!req.session.csrf_token) req.session.csrf_token = crypto.randomBytes(20).toString('hex');
  if (!req._csrfToken) {
    const payload = b64u(req.session.csrf_token);
    const ts = Math.floor(Date.now() / 1000).toString(36);
    req._csrfToken = `${payload}.${ts}.${sign(payload + '.' + ts)}`;
  }
  return req._csrfToken;
}

class CSRFError extends Error {}

function validate(token, req) {
  if (!token) throw new CSRFError('The CSRF token is missing.');
  if (!req.session.csrf_token) throw new CSRFError('The CSRF session token is missing.');
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new CSRFError('The CSRF token is invalid.');
  const [payload, ts, sig] = parts;
  const expected = sign(payload + '.' + ts);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new CSRFError('The CSRF token is invalid.');
  const age = Math.floor(Date.now() / 1000) - parseInt(ts, 36);
  if (age > config.CSRF_TIME_LIMIT) throw new CSRFError('The CSRF token has expired.');
  const raw = Buffer.from(payload, 'base64url').toString();
  const s = Buffer.from(req.session.csrf_token), r = Buffer.from(raw);
  if (s.length !== r.length || !crypto.timingSafeEqual(s, r)) throw new CSRFError('The CSRF tokens do not match.');
}

const badRequestPage = (reason) =>
  `<!doctype html>\n<html lang=en>\n<title>400 Bad Request</title>\n<h1>Bad Request</h1>\n<p>${reason}</p>\n`;

/** Express middleware: applied to every state-changing route (POST/PUT/PATCH/DELETE). */
function protect(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  try {
    const token = (req.body && req.body.csrf_token) || req.get('X-CSRFToken') || req.get('X-CSRF-Token');
    validate(token, req);
    if (req.secure) {
      const referrer = req.get('referer');
      if (!referrer) throw new CSRFError('The referrer header is missing.');
      let ok = false;
      try { ok = new URL(referrer).origin === `https://${req.get('host')}`; } catch (_) { /* invalid URL */ }
      if (!ok) throw new CSRFError('The referrer does not match the host.');
    }
  } catch (e) {
    if (!(e instanceof CSRFError)) throw e;
    console.info(e.message);
    return res.status(400).type('text/html; charset=utf-8').send(badRequestPage(e.message));
  }
  return next();
}

module.exports = { generateToken, protect };
