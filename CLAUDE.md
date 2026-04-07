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

**Stack:** React 19 + Vite + Tailwind CSS + Three.js (react-three/fiber) + Spline

**Structure:**
- `src/main.jsx` - Entry point, renders App with StrictMode
- `src/App.jsx` - Main component with navigation, hero, services, clients showcase, CTA, and footer sections
- `src/Hero3D.jsx` - Three.js canvas with layered wireframe geometry and floating particles
- `src/index.css` - Global styles with CSS custom properties, Tailwind directives, and custom component classes

**Key patterns:**
- Component-based architecture with inline Tailwind classes
- 3D hero section uses `@react-three/fiber` Canvas with `@react-three/drei` utilities (Float, Canvas)
- Hero3D layers: OuterIcosahedron (r=2.2) → MidDodecahedron (r=1.5) → CoreOctahedron (r=0.8) + Particles + GlowEdges
- Brand colors defined as CSS variables in `:root` (ink: #071b31, brand: #248bde, sky: #67c8f3)
- Glass morphism effects via `.glass-dark` class with backdrop-filter
- Smooth scroll navigation between sections
- WhatsApp integration for contact links (`wa.me/56929237511`)
- Client cards with fallback rendering (thumbnail → initial letter)

**Custom CSS utilities:**
- `.eyebrow` - Pill badge above hero heading
- `.service-card` / `.tone-*` - Service cards with tone variants (deep, brand, sky)
- `.client-card` - Project showcase cards with hover effects
- `.btn-brand` / `.btn-ghost` - Primary and secondary buttons
- `.text-gradient` - Gradient text effect

**Data structures:**
- `services` array (3 items): icon, tone, title, description, benefit, cta
- `clients` array (7 items): name, url, gradient, accent, thumbnail

**Build output:** `dist/` directory (static files for Vercel deployment)
