# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Build for production (outputs to dist/, regenerates public/sitemap.xml)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

## Architecture

**Stack:** React 19 + Vite + Tailwind CSS + Three.js (react-three/fiber) + Supabase (Auth + Postgres) + TanStack Query + react-helmet-async

**Repo:** `github.com/novautomatic/WebNexCommit` (owner: novautomatic). Deployed on Vercel at `https://www.nexcommit.com`.

**Routes (`src/App.jsx`):**
- `/` - `Home.jsx`: 3D hero, services, client portfolio (`src/data/CLIENTS.js`), FAQ, CTA
- `/servicios`, `/servicios/:slug` - `ServicesIndex.jsx` / `Services.jsx`, content in `src/data/SERVICE_PAGES.js`
- `/blog`, `/blog/:slug` - `pages/blog/BlogList.tsx` / `BlogPost.tsx`
- `/lp/:slug` - `AdLanding.jsx`: Google Ads landing pages (noindex), content in `src/data/ADS_LANDINGS.js`
- `/login` - Supabase email/password login
- `/admin` - protected (`ProtectedRoute`), lazy-loaded `Admin.jsx` with tabs Blog (`BlogAdmin.tsx`) and Cotizador (`Cotizador.jsx`, data in `PROJECT_MODULES` / `SERVICE_CATEGORIES` / `PROJECT_PRICING`). Team shortcuts/links live in the Tareas → Accesos sub-tab (`?tab=tareas&vista=accesos`, `pages/configuracion/ConfiguracionAdmin.jsx`; stored in table `accesos_directos`, migration `20261007160000_accesos_directos.sql`, hooks in `src/hooks/tareas.js`; also shown as the "Accesos" dropdown in the panel header via `AccesosMenu.jsx`)
- `/privacy`, `/terms`

**Contact + tracking:**
- `src/config/contact.js` - single source for the WhatsApp/phone number, pre-filled messages, `[Google]` tag for Ads visitors (gclid), GA4 events and Google Ads conversion IDs (empty until filled from Google Ads).
- `src/components/ContactButtons.jsx` - `WhatsAppLink` and `ContactDock` (mobile bar + desktop bubble).
- GA4 (`G-FBHZGW2YB7`) loads in `index.html` with Consent Mode v2 defaulting to denied; `src/components/CookieConsent.jsx` grants it after the visitor accepts.

**Tasks system (`/admin?tab=tareas`):**
- Schema, RLS, triggers and crons in `supabase/migrations/20261007120000_sistema_tareas.sql` (tables `equipo`, `proyectos`, `tareas`, `tarea_comentarios`, `tarea_historial`, `avisos_whatsapp`). Access = active row in `equipo` matching the session email (`es_equipo()`); only `rol = 'dueno'` edits `equipo`.
- UI in `src/pages/tareas/` (board, list, projects, team, task modal with comments/history/notices); data hooks in `src/hooks/tareas.js` with realtime refresh.
- WhatsApp notice to the assignee on create/reassign (not self-assign): trigger → `encolar_aviso_tarea()` → `pg_net` POST to Agente-Next back `/avisos/tarea` (secret in Vault `avisos_tareas_url` / `avisos_tareas_secret`) → cron `procesar-avisos-tareas` reconciles status every minute. Bulk imports use `SET LOCAL app.sin_avisos = 'on'`.
- **GitHub Issues is the source of truth** (`supabase/migrations/20261007150000_tareas_desde_github.sql`): tasks are born and move in GitHub; Supabase is a mirror. `github_sync_tick()` (pg_cron every minute + panel every 30 s) polls `GET /issues?filter=all&since=` with the `github_token` Vault secret and upserts `tareas`. The panel never writes `tareas` directly: RPCs `tarea_crear` / `tarea_actualizar` / `tarea_comentar` send REST (create, labels, comments) or GraphQL (title/body, close/reopen — pg_net has no PATCH) and keep an optimistic copy with `sync_estado = 'pendiente'`. Mapping: open/closed(+state_reason) and labels «en progreso» / «en revisión» / «bloqueada» → estado; «prioridad: X» → prioridad; person labels in `equipo.github_labels` (or `github_login` assignee) → responsable; body line «Fecha límite: AAAA-MM-DD» → fecha_limite. Internal NexCommit tasks live in the private repo `novautomatic/dashboard-tareas`.
- **Areas and clients** (`20261007170000_areas_y_clientes.sql`): `proyectos.tipo = 'area'` (no repo, owner in `area_responsable_id`) holds local-only tasks; the `tarea_*` RPCs are wrappers that handle areas locally and delegate to the renamed `tarea_*_github` versions otherwise (re-run this migration after re-running the GitHub one). `clientes` ↔ `proyectos` is many-to-many via `proyecto_clientes`; panel tabs Áreas and Clientes, client picker in the project form (`ClienteSelector.jsx`).
- This repo is PUBLIC: never commit task/issue data exports or secrets (use the gitignored `Claude outputs/`).

**Backend (Supabase):**
- Client in `src/lib/supabaseClient.ts` (anon key, public by design). Blog hooks in `src/hooks/blog/` query the `posts` table.
- `supabase/functions/auto-generate-post` - Edge Function that writes blog posts with AI.
- `insforge/` and `backend/` are leftovers from the previous InsForge backend and are not used by the frontend.

**Key patterns:**
- **Routing:** SPA routing using `react-router-dom` with `vercel.json` rewrites for production.
- **SEO:** per-page metadata via `src/components/SEO.jsx` (react-helmet-async); `scripts/generate-sitemap.mjs` builds the sitemap. Canonical host is `https://www.nexcommit.com` (apex 308-redirects to www) — never write URLs without `www`.
- **Prerender:** `npm run build` also builds `src/entry-server.jsx` (SSR) and runs `scripts/prerender.mjs`, which writes static HTML for `/`, `/servicios[/:slug]`, `/blog`, `/privacy`, `/terms` and every `/lp/:slug` (served via `cleanUrls` in `vercel.json`). Every other route falls back to the untouched shell `dist/spa.html`. Head tags baked at build carry `data-pr` and `main.jsx` removes them on boot (React 19 + helmet-async v3 append tags instead of replacing them). New public routes must be added to the list in `prerender.mjs`; components must not touch `window`/`localStorage` during render.
- **3D Hero:** Layered wireframe composition in `Hero3D.jsx` (icosahedron, dodecahedron, octahedron, particles, glow edges) wrapped in `Float`. Lazy-loaded.
- **Styling:** Brand colors via CSS variables in `:root` (ink: #071b31, brand: #248bde, sky: #67c8f3) and `.glass-dark` morphisms.

**Custom CSS utilities:**
- `.eyebrow` - Pill badge above hero heading
- `.service-card` / `.tone-*` - Service cards with tone variants (deep, brand, sky)
- `.client-card` - Project showcase cards with hover effects
- `.btn-brand` / `.btn-ghost` - Primary and secondary buttons
- `.text-gradient` - Gradient text effect

**Build output:** `dist/` directory (deployed via Vercel)
