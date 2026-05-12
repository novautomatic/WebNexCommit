# AGENTS.md

## Commands

```bash
npm run dev       # Vite dev server with HMR
npm run build     # Production build (outputs dist/)
npm run lint      # ESLint (React 19 purity rules active)
npm run preview   # Preview production build
```

No test framework or typecheck command configured.

## Stack

React 19 + Vite 8 + Tailwind CSS 3 + Three.js (react-three/fiber) + Supabase

Supabase project: `rhifvtrzetamrfhflfzw.supabase.co` (anon key hardcoded in `src/lib/supabaseClient.ts`). No `.env` file — keys are inline.

## Architecture

**Routing:** React Router in `src/App.jsx`. `vercel.json` rewrites all routes to `/index.html` (SPA catch-all). `/sitemap.xml` and `/robots.txt` served statically.

**Auth:** Supabase auth via `AuthContext.jsx`. Protected routes use `ProtectedRoute.jsx`. Login redirects to `/admin`.

**Admin panel:** `/admin` route, tabbed UI (Blog + Cotizador). Blog tab uses `BlogAdmin.tsx`, Cotizador tab uses `Cotizador.jsx`.

**Blog:** Slug-based routing `/blog/:slug`. Blog hooks in `src/hooks/blog/` use `@tanstack/react-query`. AI post generation via Supabase Edge Function `auto-generate-post` (Gemini).

**Cotizador:** Modular data in `src/data/`:
- `PROJECT_MODULES.js` — 5 project types, each with `required` + `configurable` modules
- `SERVICE_CATEGORIES.js` — categorized service catalog (~100 items)
- `PROJECT_PRICING.js` — all prices in CLP

**3D Hero:** `Hero3D.jsx` — `Math.random` in `useMemo` triggers React 19 purity lint errors (cosmetic, not runtime).

## Gotchas

- **`backend/` directory** contains only AI agent configs (`.claude`, `.windsurf`, etc.) — no application code.
- **InsForge was migrated out** — all backend uses Supabase now. Old InsForge edge functions were deleted.
- **ESLint `react-hooks/purity`** will error on `Math.random` or `Date.now()` called during render.
- **No TypeScript compiler** — only ESLint for JS/JSX files. Some `.tsx` files exist but are not typechecked.
- **Brand colors:** `#071b31` (ink), `#248bde` (brand), `#67c8f3` (sky) — defined in `src/index.css` as CSS vars.
