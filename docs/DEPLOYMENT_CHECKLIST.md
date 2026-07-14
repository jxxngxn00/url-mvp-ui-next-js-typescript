# Deployment Checklist

Use this checklist before deploying or handing off the MVP.

## Environment Variables

Configure these values in the deployment environment:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

Do not commit `.env` or `.env.sentry-build-plugin`.

## Database

- Confirm the Supabase PostgreSQL project is reachable from the deployment target.
- Confirm Prisma migrations have already been applied to the target database.
- Confirm seed or crawled hero data exists before relying on patch analysis.

## External Services

- Confirm Gemini responds with the configured `GEMINI_MODEL`.
- Confirm Sentry release and source map uploads succeed during `next build`.
- Confirm the deployed app sends runtime errors to the expected Sentry project.

## Verification

Run the full verification command before deployment:

```bash
pnpm verify
```

This command runs:

- `pnpm db:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Manual Smoke Test

After deployment, check these routes:

- `/`
- `/api/patches`
- `/api/meta-timeline`
- `/api/heroes`
- `/heroes/{heroId}`

Check these app flows:

- Patch list loads saved patch data.
- Hero filters update both hero cards and meta timeline entries.
- Hero detail page opens from a hero card or timeline entry.
- Empty, loading, and error states are readable on mobile.
- Sentry receives a test error in the expected project.
