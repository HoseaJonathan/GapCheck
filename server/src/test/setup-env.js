import { randomBytes } from 'node:crypto';

// Loaded with --import before any test module, so config.js sees these when it is first evaluated.
// A fresh random secret per run: nothing signing-capable is committed to the repo.
process.env.JWT_SECRET ??= randomBytes(48).toString('base64url');
// supertest calls the API directly (no Vite /api prefix), so the refresh cookie path must be /auth.
process.env.API_PUBLIC_PREFIX ??= '';
