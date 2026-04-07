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

**Stack:** React 19 + Vite + Tailwind CSS + Three.js (react-three/fiber)

**Structure:**
- `src/main.jsx` - Entry point, renders App with StrictMode
- `src/App.jsx` - Main component with navigation, hero, services, CTA, and footer sections
- `src/Hero3D.jsx` - Three.js canvas with layered wireframe geometry (icosahedron, dodecahedron, octahedron) and floating particles
- `src/index.css` - Global styles with CSS custom properties for theming, Tailwind directives, and custom component classes

**Key patterns:**
- Component-based architecture with inline Tailwind classes
- 3D hero section uses `@react-three/fiber` Canvas with `@react-three/drei` utilities
- Brand colors defined as CSS variables in `:root` (ink: #071b31, brand: #248bde, sky: #67c8f3)
- Glass morphism effects via `.glass-dark` class with backdrop-filter
- Smooth scroll navigation between sections
- WhatsApp integration for contact links (`wa.me/56929237511`)

**Build output:** `dist/` directory (static files for Vercel deployment)
