'use strict';
/**
 * Template engine setup. The original Jinja2 templates are reused as-is; Nunjucks is the Node.js
 * implementation of the Jinja2 syntax. This file adds the Flask/Jinja features Nunjucks lacks.
 */
const path = require('path');
const nunjucks = require('nunjucks');
const config = require('./config');
const { jinjaTruncate, pyFormat } = require('./lib/pyutil');

const TEMPLATE_DIR = path.join(__dirname, '..', 'app', 'templates');

// ---- Flask endpoint names -> URLs (used by url_for in the templates) -------------------------
const ENDPOINTS = {
  'main.home': '/',
  'main.about': '/about',
  'main.courses': '/courses',
  'main.hiring': '/hiring',
  'main.contact': '/contact',
  'main.register': '/register',
  'main.employer_request': '/employer-request',
  'main.admin_login': '/admin',
  'main.admin_dashboard': '/admin/dashboard',
  'main.admin_logout': '/admin/logout',
};

function urlFor(endpoint, kwargs) {
  const kw = kwargs && typeof kwargs === 'object' ? kwargs : {};
  if (endpoint === 'static') return '/static/' + String(kw.filename || '').split('/').map(encodeURIComponent).join('/');
  if (ENDPOINTS[endpoint]) return ENDPOINTS[endpoint];
  throw new Error(`Could not build url for endpoint '${endpoint}'`);
}

// ---- Jinja `{% with a = b %}...{% endwith %}` (not provided by Nunjucks) ---------------------
function WithExtension() {
  this.tags = ['with'];
  this.parse = function parse(parser, nodes) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    const body = parser.parseUntilBlocks('endwith');
    parser.advanceAfterBlockEnd();
    return new nodes.CallExtension(this, 'run', args, [body]);
  };
  this.run = function run(context, kwargs, body) {
    Object.keys(kwargs).forEach((k) => { if (k !== '__keywords') context.setVariable(k, kwargs[k]); });
    return new nunjucks.runtime.SafeString(body()); // body is already escaped template output
  };
}

// ---- Allow `form.field(...)` calls: Nunjucks would wrap functions and drop their properties ----
const runtime = nunjucks.runtime;
if (!runtime.__fieldPatched) {
  const original = runtime.memberLookup;
  runtime.memberLookup = function memberLookup(obj, val) {
    if (obj !== undefined && obj !== null) {
      const member = obj[val];
      if (typeof member === 'function' && member.__field) return member;
    }
    return original(obj, val);
  };
  runtime.__fieldPatched = true;
}

function createEnv() {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(TEMPLATE_DIR, { noCache: false }), {
    autoescape: true,
    throwOnUndefined: false,
  });
  env.addExtension('WithExtension', new WithExtension());

  const kwOf = (args) => {
    const last = args[args.length - 1];
    return last && typeof last === 'object' && last.__keywords ? last : null;
  };
  env.addFilter('format', (fmt, ...args) => pyFormat(fmt, ...args));
  env.addFilter('truncate', (s, ...args) => {
    const kw = kwOf(args) || {};
    const pos = kwOf(args) ? args.slice(0, -1) : args;
    return jinjaTruncate(s, pos[0] ?? kw.length, pos[1] ?? kw.killwords, pos[2] ?? kw.end, pos[3] ?? kw.leeway);
  });
  env.addFilter('sum', (arr, ...args) => {
    const kw = kwOf(args);
    const attr = kw ? kw.attribute : args[0];
    return (arr || []).reduce((t, item) => t + Number(attr ? item[attr] : item), 0);
  });
  return env;
}

const env = createEnv();

const TEMPLATE_CONFIG = {
  DEFAULT_DESCRIPTION: config.DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS: config.DEFAULT_KEYWORDS,
  DOMAIN: config.DOMAIN,
  CONTACT_EMAIL: config.CONTACT_EMAIL,
  SITE_NAME: config.SITE_NAME,
  COMPANY_NAME: config.COMPANY_NAME,
};

/** Render a template with the same implicit context Flask provides (config, request, url_for, flashes). */
function renderTemplate(req, name, context = {}) {
  let path_ = req.path;
  try { path_ = decodeURIComponent(req.path); } catch (_) { /* keep raw */ }
  return env.render(name, {
    config: TEMPLATE_CONFIG,
    request: { path: path_, endpoint: req.endpoint, method: req.method },
    url_for: urlFor,
    get_flashed_messages: () => req.getFlashedMessages(),
    ...context,
  });
}

module.exports = { renderTemplate, urlFor, ENDPOINTS, env };
