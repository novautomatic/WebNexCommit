# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Build for production (outputs to dist/)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

## Architecture

**Stack:** React 19 + Vite + Tailwind CSS + Three.js (react-three/fiber) + InsForge (Backend/DB)

**Frontend Structure:**
- `src/main.jsx` - Entry point, wraps App in `BrowserRouter` and `AuthProvider`
- `src/App.jsx` - Main router configuration and layout (nav/footer)
- `src/pages/` - Page components:
  - `Home.jsx` - Landing page with 3D hero and services
  - `BlogIndex.jsx` - List of published articles
  - `PostDetail.jsx` - Individual article view
  - `Login.jsx` - Auth entry point for admins
  - `NCAdmin.jsx` - Protected dashboard for content management
- `src/components/` - Reusable UI:
  - `Brand.jsx` - Logo and brand assets with fallback logic
  - `AuthContext.jsx` - Global auth state and InsForge session management
  - `ProtectedRoute.jsx` - Guard component for admin routes
- `src/Hero3D.jsx` - Three.js canvas with layered wireframe geometry
- `src/index.css` - Global styles and Tailwind configuration

**Backend Structure (InsForge):**
- `backend/functions/` - Serverless edge functions deployed to `https://ut8vwhk6.functions.insforge.app`:
  - `get-posts.js`, `get-post.js`, `get-categories.js` (Public Read)
  - `create-post.js`, `update-post.js`, `delete-post.js` (Admin Write - requires `is_admin` flag)
  - `get-comments.js`, `delete-comment.js`, `add-comment.js` (Moderation)
  - `check-admin.js` (Auth validation - returns `{ isAdmin, user }`)
- **OAuth Flow:** Login redirects to `https://ut8vwhk6.functions.insforge.app/login`, logout to `https://insforge.dev/logout`
- **Admin Panel:** `/ncadmin` - Tab-based UI (Posts/Comments) with inline editor, category selector, and CRUD operations.

**Key patterns:**
- **Routing:** SPA routing using `react-router-dom` with `vercel.json` rewrites for production.
- **Security:** Access control based on `is_admin` flag in the `profiles` table.
- **3D Hero:** Layered composition in `Hero3D.jsx`:
  - `OuterIcosahedron` (r=2.2, wireframe, opacity 0.55) - slow rotation
  - `MidDodecahedron` (r=1.5, wireframe, opacity 0.35) - counter-rotation
  - `CoreOctahedron` (r=0.8, wireframe, opacity 0.9) - fast rotation
  - `Particles` (100 points, radial distribution r=2.5-4.5)
  - `GlowEdges` (pulsing opacity 0.6-0.9)
  - All wrapped in `Float` for subtle movement
- **Styling:** Brand colors via CSS variables in `:root` (ink: #071b31, brand: #248bde, sky: #67c8f3) and `.glass-dark` morphisms.
- **Data Flow:** Frontend → InsForge Edge Functions (`https://ut8vwhk6.functions.insforge.app`) → PostgreSQL.
- **Blog URLs:** Posts use slug-based routing (`/blog/:slug`), fetched via `get-post?slug={slug}`.

**Custom CSS utilities:**
- `.eyebrow` - Pill badge above hero heading
- `.service-card` / `.tone-*` - Service cards with tone variants (deep, brand, sky)
- `.client-card` - Project showcase cards with hover effects
- `.btn-brand` / `.btn-ghost` - Primary and secondary buttons
- `.text-gradient` - Gradient text effect

**Build output:** `dist/` directory (deployed via Vercel)
