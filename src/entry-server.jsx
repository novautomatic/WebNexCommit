// Build-time renderer used by scripts/prerender.mjs (never shipped to the browser).
// Renders one route to HTML so crawlers get real content + per-page metadata
// without having to execute the SPA.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App.jsx';

export function render(url) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}
