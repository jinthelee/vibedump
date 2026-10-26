# VibeDump deployment

This branch keeps the React/Vite frontend on Cloudflare Pages and runs the existing Express + SQLite API as a separate Node service. The Pages Function at `functions/api/[[path]].ts` forwards `/api/*` requests to that service, so the frontend can continue using the same-origin `/api` URL.

## 1. Deploy the API on Render

1. In Render, create a new Blueprint from this repository and select `render.yaml`.
2. Set a strong, unique `ADMIN_SECRET` when prompted. Do not reuse a password from another service.
3. Deploy the `vibedump-api` web service.
4. Copy its public service URL, for example `https://your-service.onrender.com`.

The service is configured with a persistent disk mounted at `/var/data` because SQLite data must survive restarts and deployments. This requires a paid Render web-service plan; do not switch to an ephemeral free service if you need persistent data.

## 2. Configure Cloudflare Pages

In the Pages project, open **Settings → Environment variables** and add:

- `BACKEND_URL`: the Render service URL from step 1, with no trailing slash.

Add it for both Production and Preview if you want preview deployments to reach the API. Redeploy Pages after changing the variable.

## 3. Admin access

The default hard-coded admin password has been removed. Admin login requires the `ADMIN_SECRET` environment variable (or a deliberately configured custom admin password already stored in the database). If `ADMIN_SECRET` is missing, the default credential will not work.

## 4. Smoke tests

After both deployments finish, verify:

- `https://YOUR-PAGES-DOMAIN/api/health` returns JSON with `status: "ok"`.
- The public service list loads.
- Admin login works with the configured secret.
- An admin edit request succeeds and the change remains after the API service restarts.

## Notes

- This deployment path uses the existing Node/SQLite API; the D1 binding in `wrangler.toml` is not used by this API service.
- No database migration from SQLite to D1 is performed here.
- Review service logs and confirm the API is healthy before relying on the deployment.
