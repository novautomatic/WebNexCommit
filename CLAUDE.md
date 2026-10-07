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
- `/admin` - protected (`ProtectedRoute`), lazy-loaded `Admin.jsx` with tabs Blog (`BlogAdmin.tsx`) and Cotizador (`Cotizador.jsx`, data in `PROJECT_MODULES` / `SERVICE_CATEGORIES` / `PROJECT_PRICING`)
- `/privacy`, `/terms`

**Contact + tracking:**
- `src/config/contact.js` - single source for the WhatsApp/phone number, pre-filled messages, `[Google]` tag for Ads visitors (gclid), GA4 events and Google Ads conversion IDs (empty until filled from Google Ads).
- `src/components/ContactButtons.jsx` - `WhatsAppLink` and `ContactDock` (mobile bar + desktop bubble).
- GA4 (`G-FBHZGW2YB7`) loads in `index.html` with Consent Mode v2 defaulting to denied; `src/components/CookieConsent.jsx` grants it after the visitor accepts.

**Backend (Supabase):**
- Client in `src/lib/supabaseClient.ts` (anon key, public by design). Blog hooks in `src/hooks/blog/` query the `posts` table.
- `supabase/functions/auto-generate-post` - Edge Function that writes blog posts with AI.
- `insforge/` and `backend/` are leftovers from the previous InsForge backend and are not used by the frontend.

**Key patterns:**
- **Routing:** SPA routing using `react-router-dom` with `vercel.json` rewrites for production.
- **SEO:** per-page metadata via `src/components/SEO.jsx` (react-helmet-async); `scripts/generate-sitemap.mjs` builds the sitemap.
- **3D Hero:** Layered wireframe composition in `Hero3D.jsx` (icosahedron, dodecahedron, octahedron, particles, glow edges) wrapped in `Float`. Lazy-loaded.
- **Styling:** Brand colors via CSS variables in `:root` (ink: #071b31, brand: #248bde, sky: #67c8f3) and `.glass-dark` morphisms.

**Custom CSS utilities:**
- `.eyebrow` - Pill badge above hero heading
- `.service-card` / `.tone-*` - Service cards with tone variants (deep, brand, sky)
- `.client-card` - Project showcase cards with hover effects
- `.btn-brand` / `.btn-ghost` - Primary and secondary buttons
- `.text-gradient` - Gradient text effect

**Build output:** `dist/` directory (deployed via Vercel)
