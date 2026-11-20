'use strict';
/** Express application factory (port of app/__init__.py `create_app`). */
const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const config = require('./config');
const { router, STATIC_DIR } = require('./routes');
const { renderTemplate } = require('./views');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true); // Vercel terminates TLS in front of the function
  app.set('strict routing', true); // Flask: /about/ is a 404
  app.set('case sensitive routing', true);

  // Static assets (on Vercel, /static/* is normally served straight from the CDN: public/static)
  app.use('/static', express.static(STATIC_DIR, { redirect: false, index: false }));

  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Signed, cookie-based session (stateless -> works across serverless instances)
  app.use(cookieSession({
    name: 'session',
    keys: [config.SECRET_KEY],
    httpOnly: true,
    sameSite: 'lax',
    secure: config.SESSION_COOKIE_SECURE,
    signed: true,
    overwrite: true,
  }));

  app.use((req, _res, next) => {
    // Permanent (admin) sessions expire after PERMANENT_SESSION_LIFETIME of inactivity (sliding)
    if (req.session._exp && req.session._exp < Date.now()) req.session = {};
    if (req.session._permanent) {
      req.session._exp = Date.now() + config.PERMANENT_SESSION_LIFETIME * 1000;
      req.sessionOptions.maxAge = config.PERMANENT_SESSION_LIFETIME * 1000;
    }
    // get_flashed_messages(with_categories=True): returns once, then clears. `null` when empty
    // because an empty array is truthy in Nunjucks (falsy in Jinja).
    req.getFlashedMessages = () => {
      if (!req._flashes) {
        req._flashes = Array.isArray(req.session._flashes) ? req.session._flashes : [];
        if (req.session._flashes) delete req.session._flashes;
      }
      return req._flashes.length ? req._flashes : null;
    };
    next();
  });

  app.use(router);

  // 404 -> templates/404.html
  app.use((req, res) => {
    res.status(404).set('Vary', 'Cookie').type('text/html; charset=utf-8').send(renderTemplate(req, '404.html'));
  });

  // 500 -> templates/500.html
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err && err.status && err.status >= 400 && err.status < 500) {
      return res.status(err.status).type('text/plain; charset=utf-8').send(err.message || 'Bad Request');
    }
    console.error('UNHANDLED ERROR:', err);
    try {
      return res.status(500).set('Vary', 'Cookie').type('text/html; charset=utf-8').send(renderTemplate(req, '500.html'));
    } catch (e) {
      return res.status(500).type('text/plain').send('Internal Server Error');
    }
  });

  return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
