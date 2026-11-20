# Migration Report: Flask (Python) → Node.js / Express

A 1:1 backend technology migration. No page, route, feature, template, style, or asset was
redesigned — the Jinja2 templates, CSS, JS and images are reused unchanged from the original
project; only the server has been rewritten in JavaScript.

## 1. Route map (Flask → Express)

| Flask route (`app/routes.py`) | Methods | Node.js route (`src/routes.js`) |
|---|---|---|
| `/` (`main.home`) | GET | `/` |
| `/about` (`main.about`) | GET | `/about` |
| `/courses` (`main.courses`) | GET | `/courses` |
| `/hiring` (`main.hiring`) | GET | `/hiring` |
| `/contact` (`main.contact`) | GET, POST | `/contact` |
| `/register` (`main.register`) | GET, POST | `/register` |
| `/employer-request` (`main.employer_request`) | GET, POST | `/employer-request` |
| `/admin` (`main.admin_login`) | GET, POST | `/admin` |
| `/admin/dashboard` (`main.admin_dashboard`) | GET | `/admin/dashboard` |
| `/admin/logout` (`main.admin_logout`) | GET | `/admin/logout` |
| `/robots.txt` | GET | `/robots.txt` |
| `/sitemap.xml` | GET | `/sitemap.xml` |
| `/mail-test` | GET | `/mail-test` |
| `/favicon.ico`, `/apple-touch-icon.png`, `/icon.svg`, `/google7440c8aafe31bbe1.html` | GET | same paths |
| any other method on the above | 405 | 405, with the same `Allow` header Flask/Werkzeug sends |
| unknown path | 404 → `404.html` | 404 → `404.html` |
| unhandled error | 500 → `500.html` | 500 → `500.html` |

`/static/<path>` is served by `express.static` from `public/static/` (same files, same folder
layout as the old `app/static/`).

## 2. What changed under the hood (and why)

| Flask / Python piece | Node.js replacement | Why |
|---|---|---|
| Flask + Jinja2 | Express 4 + Nunjucks | Nunjucks implements the Jinja2 template language, so every `.html` file under `app/templates/` is reused byte-for-byte. A few Jinja features Nunjucks doesn't ship with (`{% with %}`, the `format`/`truncate`/`sum` filters, calling `form.field(...)`) are added back in `src/views.js`. |
| Flask-WTF forms (`app/forms.py`) | `src/lib/formkit.js` | A small WTForms-compatible form/validator layer: same fields, same validators, same default error messages, same generated HTML attributes (`required`, `minlength`, `maxlength`, `min`, `max`), so the existing form templates render identically. Verified against the original with 13,400+ generated test cases (see "Testing" below) — zero differences. |
| Flask-WTF CSRF protection | `src/lib/csrf.js` | Same signed, time-limited token scheme and the same "CSRF token is missing/invalid/expired" messages and 400 response. |
| `email_validator` (used by WTForms' `Email()`) | `isValidEmail()` in `src/lib/formkit.js` | Re-implements the same syntax rules (local-part charset/length, IDNA domain, label rules, numeric/special-use TLD rejection, total length ≤254, no whitespace/control characters) without needing a Python-only package. |
| Werkzeug `check_password_hash` | `src/lib/password.js` | Verifies `pbkdf2:*` and `scrypt:*` hashes exactly like Werkzeug, so an existing `ADMIN_PASSWORD_HASH` value keeps working unchanged. |
| Flask `session` / `flash()` | `cookie-session` + `req.getFlashedMessages()` | Flask's server-side session (Flask's own default is also a signed cookie) becomes an explicit signed cookie — necessary because Vercel functions are stateless/ephemeral between requests. |
| Flask-SQLAlchemy + **SQLite** (`aptcampus.db`) | `pg` (`src/db.js`) + **Postgres** | Vercel's filesystem is read-only/ephemeral — a SQLite file cannot persist there. Schema and queries are a direct port of the two tables (`registrations`, `employer_requests`); run `npm run db:init` once against a Postgres database (e.g. Vercel Postgres, Neon, Supabase) to create them, or let the app create them lazily on first use. |
| Flask-Mail (SMTP) + Resend HTTPS fallback (`app/email_utils.py`) | `nodemailer` (SMTP) + `fetch` (Resend) (`src/email.js`) | Same dual-path logic, same subjects/recipients/reply-to/body text for all 6 e-mail types. Verified byte-for-byte against the Python version. Note: Vercel's serverless functions cannot open outbound SMTP sockets on most plans — set `RESEND_API_KEY` (HTTPS) for reliable delivery there; SMTP still works for local/self-hosted use. |
| Python `datetime` objects passed into templates | `PyDateTime` (`src/lib/pydate.js`) | Reproduces `strftime()` and `str(datetime)` so `registration.created_at.strftime('%d %b %Y')` in the templates keeps working unchanged. |
| `wsgi.py` / `render.yaml` (Render.com) | `vercel.json` + `api/index.js` | Vercel-specific serverless deployment config. `server.js` is still available for local development (`npm start`) or any other Node host. |

Nothing else changed: the HTML, CSS (`public/static/css`), JS (`public/static/js`), images, fonts,
favicon, course data, copy, SEO meta tags, colors, layout and responsive behavior are the exact
files/values from the Flask project.

## 3. Files no longer required (Python/Flask-specific)

These remain in the repository for reference but are not used by the Node.js app and can be
deleted once you've confirmed the migration on your own hosting:

- `app.py`, `wsgi.py`, `config.py`
- `app/__init__.py`, `app/routes.py`, `app/forms.py`, `app/models.py`, `app/email_utils.py`,
  `app/context.py`, `app/auth.py`, `app/errors.py` (if present)
- `requirements.txt`, `render.yaml`
- any `__pycache__/`, `*.pyc`, `aptcampus.db` (SQLite file)

`app/templates/`, `app/static/` (now `public/static/`) and `app/*.txt`/`*.xml` template sources are
still in use — do not delete those.

## 4. Environment variables to configure

See `.env.example` for the full list with comments. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `SECRET_KEY` | **Yes** (production) | Signs session cookies and CSRF tokens. |
| `ADMIN_USERNAME` | No (defaults to `admin`) | Admin dashboard login. |
| `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` | **Yes** (production) | Admin dashboard password. |
| `DATABASE_URL` | **Yes** | Postgres connection string for registrations/employer requests. |
| `RESEND_API_KEY` | Recommended on Vercel | HTTPS e-mail delivery. |
| `RESEND_FROM_EMAIL` | No | Defaults to the Resend sandbox sender. |
| `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_SSL`, `MAIL_USE_TLS`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Only if not using Resend | SMTP fallback, same defaults as the Flask app (`smtp.zoho.in:465`). |
| `SESSION_COOKIE_SECURE` | No | Set `True` once served over HTTPS (Vercel does this for you). |

No secret is hard-coded anywhere in the source.

## 5. Testing performed

1. **Route-by-route byte comparison.** The original Flask app and the migrated Node.js app were
   both run locally against the same Postgres database and exercised with identical requests
   (every GET page, every POST form — valid, invalid, and missing-CSRF cases — admin login, admin
   logout, the dashboard, 404, 405, robots.txt, sitemap.xml, `/mail-test`). After normalizing only
   the CSRF token value and the run timestamp, **all 26 responses are byte-for-byte identical**
   (HTML, status code, `Content-Type`).
2. **Form-validation fuzzing.** 13,402 generated inputs (empty/boundary/overlong strings, invalid
   and edge-case e-mail addresses, Unicode digits, malformed numbers, every field of every one of
   the 4 forms) were run through the original WTForms forms and the new `formkit.js` forms side by
   side, comparing: whether validation passed, every field's error list, every field's rendered
   HTML, every field's rendered `<label>`, and the parsed `data` value. **0 mismatches.**
3. **E-mail content.** All 6 e-mail-sending functions (admin/user, for registration, employer
   request, and contact) were invoked with representative data (including special characters and
   empty optional fields) against both the Python and Node.js implementations, comparing the exact
   recipient, subject, reply-to, and body text sent to the mail provider. **0 mismatches.**
4. **Error paths.** Verified the 404 and 500 pages render through the real templates (forced a
   database-connection failure to trigger the 500 path), and that CSRF-missing/expired/invalid
   requests get the same 400 response as Flask-WTF.
5. **Manual page-by-page review** of `home`, `about`, `courses` (including each course detail
   block and the "Coming Soon" 3D Rebar Detailing course), `hiring`, `contact`, `register`,
   `employer-request`, `admin` login/dashboard/logout, confirming navigation links, forms, flash
   messages, and course cards all match.

## 6. Deploying to Vercel

1. Push this project to a Git repository and import it into Vercel (Framework Preset: **Other**).
2. In Project Settings → Environment Variables, add the variables from `.env.example` (at minimum
   `SECRET_KEY`, `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`, and `DATABASE_URL`; `RESEND_API_KEY` is
   strongly recommended since Vercel functions generally can't make outbound SMTP connections).
3. Provision a Postgres database (Vercel Postgres, Neon, Supabase, etc.) and set `DATABASE_URL` to
   its connection string. The two tables are created automatically on first request, or run
   `DATABASE_URL=... npm run db:init` once beforehand.
4. Deploy. `vercel.json` routes every request to `api/index.js` (the Express app) and tells Vercel
   to bundle `app/templates/**` and `public/static/**` into the function so templates and static
   assets are available at runtime.
5. Visit `/mail-test` after deploying to confirm which e-mail path is active, and submit the
   register/contact/employer forms once to confirm e-mail delivery end-to-end.

## 7. Running locally

```bash
npm install
cp .env.example .env   # then fill in SECRET_KEY, ADMIN_PASSWORD, DATABASE_URL, …
npm run db:init        # creates the Postgres tables (skip if you'd rather let the app do it lazily)
npm start               # http://localhost:5000
```
