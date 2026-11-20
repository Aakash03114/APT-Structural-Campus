# APT Structural Campus

Professional structural detailing & estimation training — course registrations, employer hiring
requests, and an admin dashboard.

This is the **Node.js / Express** version of the site, migrated 1:1 from the original Python/Flask
project for deployment on Vercel. See **[MIGRATION.md](./MIGRATION.md)** for the full route map,
what changed under the hood and why, environment variables, and deployment instructions.

## Quick start

```bash
npm install
cp .env.example .env   # fill in SECRET_KEY, ADMIN_PASSWORD, DATABASE_URL, …
npm run db:init
npm start                # http://localhost:5000
```
