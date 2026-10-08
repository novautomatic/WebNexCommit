import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Head tags baked in at build time (scripts/prerender.mjs + index.html fallback).
// React renders its own per route, so drop these to avoid a stale duplicate title.
document.querySelectorAll('head [data-pr]').forEach((node) => node.remove())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
