'use strict';
/** Port of app/routes.py (Flask blueprint `main`) to an Express router. */
const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('./config');
const db = require('./db');
const email = require('./email');
const csrf = require('./lib/csrf');
const { createForm, specs } = require('./lib/formkit');
const { verifyAdminPassword } = require('./lib/password');
const { flaskJson } = require('./lib/pyutil');
const { renderTemplate, urlFor } = require('./views');
const courses = require('./data/courses.json');

const STATIC_DIR = path.join(__dirname, '..', 'public', 'static');
const router = express.Router({ strict: true, caseSensitive: true });

// ------------------------------------------------------------------ helpers
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function render(req, res, name, context, status = 200) {
  res.status(status).set('Vary', 'Cookie').type('text/html; charset=utf-8').send(renderTemplate(req, name, context));
}

/** Same body Werkzeug sends with a 302 redirect. */
function redirect(res, location) {
  res.status(302).set('Location', location).type('text/html; charset=utf-8').send(
    '<!doctype html>\n<html lang=en>\n<title>Redirecting...</title>\n<h1>Redirecting...</h1>\n' +
    `<p>You should be redirected automatically to the target URL: <a href="${location}">${location}</a>. If not, click the link.\n`
  );
}

const methodNotAllowed = (allowed) => (req, res) => {
  res.set('Allow', allowed.join(', '));
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).type('text/html; charset=utf-8').send(
    '<!doctype html>\n<html lang=en>\n<title>405 Method Not Allowed</title>\n<h1>Method Not Allowed</h1>\n' +
    '<p>The method is not allowed for the requested URL.</p>\n'
  );
};

/**
 * Register a route like Flask's @route(path, methods=[...]): sets the endpoint name, applies CSRF
 * protection to POST, and answers other methods with 405 (OPTIONS with the Allow header).
 * `handlers` run for GET (and POST); every route here supports GET.
 */
function route(urlPath, methods, endpoint, ...handlers) {
  const tag = (req, _res, next) => { req.endpoint = endpoint; next(); };
  const chain = handlers.map(asyncHandler);
  router.get(urlPath, tag, ...chain);
  if (methods.includes('POST')) router.post(urlPath, tag, csrf.protect, ...chain);
  router.all(urlPath, methodNotAllowed([...methods, 'HEAD', 'OPTIONS']));
}

// Flask `flash()` / `get_flashed_messages(with_categories=True)` backed by the signed session cookie
function flash(req, message, category = 'message') {
  if (!Array.isArray(req.session._flashes)) req.session._flashes = [];
  req.session._flashes = [...req.session._flashes, [category, message]];
}

function adminRequired(req, res, next) {
  if (!req.session.admin_logged_in) {
    flash(req, 'Please log in to access the administrator area.', 'warning');
    return redirect(res, urlFor('main.admin_login'));
  }
  return next();
}

// ------------------------------------------------------------------ pages
route('/', ['GET'], 'main.home', (req, res) => render(req, res, 'home.html', { title: 'Home' }));
route('/about', ['GET'], 'main.about', (req, res) => render(req, res, 'about.html', { title: 'About' }));
route('/courses', ['GET'], 'main.courses', (req, res) => render(req, res, 'courses.html', { courses }));
route('/hiring', ['GET'], 'main.hiring', (req, res) => render(req, res, 'hiring.html', { title: 'Hiring Solutions' }));

// ------------------------------------------------------------------ contact
const contactHandler = async (req, res) => {
  const form = createForm(specs.ContactForm, req);

  if (req.method === 'POST') {
    let name, emailAddr, phone, subject, message;
    const body = req.body || {};
    const first = (v) => (Array.isArray(v) ? v[0] : v);
    if (form.validate_on_submit()) {
      name = form.name.data.trim();
      emailAddr = form.email.data.trim();
      phone = form.phone.data ? form.phone.data.trim() : '';
      subject = form.subject.data || 'General Enquiry';
      message = form.message.data.trim();
    } else {
      // Same lenient fallback as the Flask view when validation fails
      name = String(first(body.name) ?? '').trim();
      emailAddr = String(first(body.email) ?? '').trim();
      phone = String(first(body.phone) ?? '').trim();
      subject = String(first(body.subject) ?? 'General Enquiry').trim();
      message = String(first(body.message) ?? '').trim();
    }

    if (name && emailAddr && message) {
      let adminOk = false;
      let userOk = false;
      try {
        await email.sendAdminContactEmail(name, emailAddr, phone, subject, message);
        adminOk = true;
      } catch (e) {
        console.log('ADMIN CONTACT EMAIL ERROR:', e.message);
      }
      try {
        await email.sendContactConfirmationEmail(name, emailAddr, subject, message);
        userOk = true;
      } catch (e) {
        console.log('USER CONTACT CONFIRMATION EMAIL ERROR:', e.message);
      }

      if (adminOk || userOk) {
        flash(req, 'Thank you for reaching out! Your message has been sent successfully. We will get back to you soon.', 'success');
      } else {
        flash(req, 'Your message was received, but there was an issue sending the notification email. Our team will review your enquiry shortly.', 'info');
      }
      return redirect(res, urlFor('main.contact'));
    }
    flash(req, 'Please fill in all required fields (Name, Email, and Message).', 'danger');
  }

  return render(req, res, 'contact.html', { form, title: 'Contact' });
};
route('/contact', ['GET', 'POST'], 'main.contact', contactHandler);

// ------------------------------------------------------------------ static root files
const sendStatic = (file, mimetype) => (req, res) => {
  res.type(mimetype).sendFile(path.join(STATIC_DIR, file), { cacheControl: false, headers: { 'Cache-Control': 'no-cache' } });
};
route('/favicon.ico', ['GET'], 'main.favicon', sendStatic('favicon.ico', 'image/vnd.microsoft.icon'));
route('/apple-touch-icon.png', ['GET'], 'main.apple_touch_icon', sendStatic('apple-touch-icon.png', 'image/png'));
route('/icon.svg', ['GET'], 'main.icon_svg', sendStatic('icon.svg', 'image/svg+xml'));
route('/google7440c8aafe31bbe1.html', ['GET'], 'main.google_verification', sendStatic('google7440c8aafe31bbe1.html', 'text/html'));

route('/robots.txt', ['GET'], 'main.robots', (req, res) => {
  res.type('text/plain; charset=utf-8').send(renderTemplate(req, 'robots.txt'));
});

route('/sitemap.xml', ['GET'], 'main.sitemap', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const pages = [
    ['main.home', '1.0', 'daily'],
    ['main.courses', '0.9', 'weekly'],
    ['main.hiring', '0.9', 'weekly'],
    ['main.about', '0.8', 'monthly'],
    ['main.contact', '0.8', 'monthly'],
    ['main.register', '0.8', 'weekly'],
    ['main.employer_request', '0.8', 'weekly'],
  ].map(([endpoint, priority, changefreq]) => ({ url: base + urlFor(endpoint), priority, changefreq }));
  const today = new Date().toISOString().slice(0, 10);
  res.type('application/xml; charset=utf-8').send(renderTemplate(req, 'sitemap.xml', { pages, today }));
});

// ------------------------------------------------------------------ registration
route('/register', ['GET', 'POST'], 'main.register', async (req, res) => {
  const form = createForm(specs.RegistrationForm, req);

  if (form.validate_on_submit()) {
    // Save first, then e-mail (as before)
    const registration = await db.createRegistration({
      full_name: form.full_name.data,
      email: form.email.data,
      phone: form.phone.data,
      course: form.course.data,
      qualification: form.qualification.data,
      message: form.message.data,
    });

    try {
      await email.sendAdminRegistrationEmail(registration);
    } catch (e) {
      console.log('ADMIN EMAIL ERROR:', e.message);
    }
    try {
      await email.sendApplicantConfirmationEmail(registration);
    } catch (e) {
      console.log('APPLICANT EMAIL ERROR:', e.message);
    }

    return render(req, res, 'registration_success.html', { registration });
  }

  return render(req, res, 'register.html', { form });
});

// ------------------------------------------------------------------ employer request
route('/employer-request', ['GET', 'POST'], 'main.employer_request', async (req, res) => {
  const form = createForm(specs.EmployerRequestForm, req);

  if (form.validate_on_submit()) {
    const request = await db.createEmployerRequest({
      company_name: form.company_name.data,
      contact_person: form.contact_person.data,
      email: form.email.data,
      phone: form.phone.data,
      location: form.location.data,
      position: form.position.data,
      employees_required: form.employees_required.data,
      experience: form.experience.data,
      employment_type: form.employment_type.data,
      skills: form.skills.data,
      job_description: form.job_description.data,
      additional_message: form.additional_message.data,
    });

    try {
      await email.sendAdminEmployerRequestEmail(request);
    } catch (e) {
      console.log('ADMIN EMPLOYER REQUEST EMAIL ERROR:', e.message);
    }
    try {
      await email.sendEmployerConfirmationEmail(request);
    } catch (e) {
      console.log('EMPLOYER CONFIRMATION EMAIL ERROR:', e.message);
    }

    return render(req, res, 'employer_request_success.html', { employer_request: request });
  }

  return render(req, res, 'employer_request.html', { form, title: 'Request Employees' });
});

// ------------------------------------------------------------------ admin
route('/admin', ['GET', 'POST'], 'main.admin_login', async (req, res) => {
  if (req.session.admin_logged_in) return redirect(res, urlFor('main.admin_dashboard'));

  const form = createForm(specs.AdminLoginForm, req);

  if (form.validate_on_submit()) {
    const username = form.username.data.trim();
    const password = form.password.data;

    if (username === config.ADMIN_USERNAME && verifyAdminPassword(password)) {
      // session.clear(); session["admin_logged_in"] = True; session.permanent = True
      req.session = { admin_logged_in: true, _permanent: true, _exp: Date.now() + config.PERMANENT_SESSION_LIFETIME * 1000 };
      req.sessionOptions.maxAge = config.PERMANENT_SESSION_LIFETIME * 1000;
      flash(req, 'Welcome back, Administrator.', 'success');
      return redirect(res, urlFor('main.admin_dashboard'));
    }
    flash(req, 'Invalid username or password.', 'danger');
  }

  return render(req, res, 'admin_login.html', { form, title: 'Admin Login' });
});

route('/admin/dashboard', ['GET'], 'main.admin_dashboard', adminRequired, async (req, res) => {
  const [registrations, employerRequests] = await Promise.all([
    db.listRegistrations(),
    db.listEmployerRequests(),
  ]);
  return render(req, res, 'admin_dashboard.html', {
    registrations,
    employer_requests: employerRequests,
    title: 'Admin Dashboard',
  });
});

route('/admin/logout', ['GET'], 'main.admin_logout', (req, res) => {
  req.session = {}; // session.clear()
  flash(req, 'You have been logged out successfully.', 'info');
  return redirect(res, urlFor('main.admin_login'));
});

// ------------------------------------------------------------------ diagnostics
route('/mail-test', ['GET'], 'main.mail_test', (req, res) => {
  const resendKey = config.RESEND_API_KEY;
  res.set('Content-Type', 'application/json').send(Buffer.from(flaskJson({
    email_mode: resendKey ? 'Resend API (HTTPS Port 443)' : 'SMTP (Flask-Mail)',
    resend_api_configured: Boolean(resendKey),
    resend_from_email: config.RESEND_FROM_EMAIL,
    smtp_server: config.MAIL_SERVER,
    smtp_port: config.MAIL_PORT,
    smtp_username: config.MAIL_USERNAME,
    smtp_password_loaded: config.MAIL_PASSWORD !== undefined,
  }) + '\n'));
});

module.exports = { router, flash, STATIC_DIR };
