// Prerenders the public routes into static HTML after `vite build`, so Google
// (and WhatsApp/social previews) get the real content, title, description and
// canonical of each page in the first response instead of an empty SPA shell.
//
// Output (served by Vercel with cleanUrls):
//   dist/index.html                      → "/"
//   dist/servicios.html                  → "/servicios"
//   dist/servicios/<slug>.html           → "/servicios/<slug>"
//   dist/lp/<slug>.html                  → "/lp/<slug>" (Ads landings: faster LCP)
//   dist/spa.html                        → untouched shell, fallback for every other
//                                          route (blog posts, admin…), see vercel.json
//
// The browser still boots the normal SPA: main.jsx removes the head tags marked
// data-pr and createRoot replaces the prerendered markup.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SERVICE_PAGES } from '../src/data/SERVICE_PAGES.js';
import { ADS_LANDINGS } from '../src/data/ADS_LANDINGS.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const ssrEntry = resolve(root, 'node_modules/.cache/prerender/entry-server.js');

const routes = [
  '/',
  '/servicios',
  ...SERVICE_PAGES.map((s) => `/servicios/${s.slug}`),
  '/blog',
  '/privacy',
  '/terms',
  ...ADS_LANDINGS.map((l) => `/lp/${l.slug}`),
];

// React 19 emits hoisted <title>/<meta>/<link> at the start of the string.
const HOISTED = /^(?:<title\b[^>]*>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>)+/;

const template = readFileSync(resolve(dist, 'index.html'), 'utf-8');
writeFileSync(resolve(dist, 'spa.html'), template);

// Static fallback title/description in index.html carry data-pr; drop them on
// prerendered pages, which bring their own.
const shell = template
  .replace(/<title data-pr>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta data-pr name="description"[^>]*>\s*/, '');

const { render } = await import(pathToFileURL(ssrEntry).href);

for (const route of routes) {
  const html = render(route);
  const head = (html.match(HOISTED) || [''])[0];
  const body = html.slice(head.length);
  const markedHead = head.replace(/<(title|meta|link)\b/g, '<$1 data-pr');

  const page = shell
    .replace('</head>', `${markedHead}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  const file = route === '/' ? resolve(dist, 'index.html') : resolve(dist, `${route.slice(1)}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page);
  console.log(`prerendered ${route}`);
}

console.log(`Prerendered ${routes.length} routes`);
process.exit(0);
