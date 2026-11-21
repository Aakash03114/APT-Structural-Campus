'use strict';
/**
 * Application configuration (port of Flask `config.py`).
 * Every secret comes from environment variables (Vercel -> Project Settings -> Environment Variables).
 */
const isProduction = process.env.NODE_ENV === 'production';

const asBool = (value, fallback) => {
  const v = value === undefined ? fallback : value;
  return ['true', '1', 'yes'].includes(String(v).toLowerCase());
};

const mailUsername = process.env.MAIL_USERNAME !== undefined ? process.env.MAIL_USERNAME : 'info@aptcampus.com';

// SECRET_KEY: the Flask app had a hard-coded dev fallback. We keep that fallback for local
// development only; a production deployment must provide its own key.
let secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  if (isProduction) {
    throw new Error('SECRET_KEY environment variable is required in production.');
  }
  secretKey = 'apt-structural-campus-dev-key';
}

const config = {
  SECRET_KEY: secretKey,

  ADMIN_USERNAME: process.env.ADMIN_USERNAME !== undefined ? process.env.ADMIN_USERNAME : 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,

  SITE_NAME: 'APT Structural Campus',
  COMPANY_NAME: 'APT Structural Campus',
  DOMAIN: 'https://www.aptcampus.com',
  CONTACT_EMAIL: 'info@aptcampus.com',

  // Session security
  SESSION_COOKIE_SECURE: asBool(process.env.SESSION_COOKIE_SECURE, 'False'),
  PERMANENT_SESSION_LIFETIME: 3600, // seconds (1 hour)
  CSRF_TIME_LIMIT: 3600, // seconds (Flask-WTF default)

  // SEO
  DEFAULT_DESCRIPTION:
    'Practical training in 2D/3D rebar detailing, rebar estimation, and concrete estimation for civil engineers and professionals at APT Structural Campus.',

  DEFAULT_KEYWORDS:
    'apt structural campus, apt campus, structural campus, ' +
    'Detailing, Estimation, Rebar detailing, Rebar estimation, ' +
    'detailing training, rebar training, estimation training, ' +
    'Detailing hiring, Estimation hiring, Civil, Civil job vacancy, ' +
    'structural detailing training, 2D rebar detailing, 3D rebar detailing, concrete estimation',

  // Database (replaces SQLite `sqlite:///aptcampus.db`, which cannot persist on Vercel)
  DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL,

  // Email: Resend HTTPS API (primary) and SMTP (fallback)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'APT Structural Campus <onboarding@resend.dev>',
  MAIL_SERVER: process.env.MAIL_SERVER || 'smtp.zoho.in',
  MAIL_PORT: parseInt(process.env.MAIL_PORT || '465', 10),
  MAIL_USE_SSL: asBool(process.env.MAIL_USE_SSL, 'True'),
  MAIL_USE_TLS: asBool(process.env.MAIL_USE_TLS, 'False'),
  MAIL_USERNAME: mailUsername,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD,
  MAIL_DEFAULT_SENDER: ['APT Structural Campus', mailUsername],
  MAIL_TIMEOUT: parseInt(process.env.MAIL_TIMEOUT || '10', 10),
};

module.exports = config;
