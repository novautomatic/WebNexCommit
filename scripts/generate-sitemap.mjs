// Generates public/sitemap.xml from static routes + published blog posts.
// Runs automatically before `npm run build` via the `prebuild` script.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SERVICE_PAGES } from '../src/data/SERVICE_PAGES.js';
import { supabase } from './publicSupabase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = resolve(__dirname, '../public/sitemap.xml');
const SITE_URL = 'https://www.nexcommit.com';

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().split('T')[0];
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function buildSitemap(postEntries) {
  const today = formatDate();

  const staticEntries = [
    buildUrlEntry({ loc: `${SITE_URL}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' }),
    buildUrlEntry({ loc: `${SITE_URL}/crea-tu-web`, lastmod: today, changefreq: 'monthly', priority: '0.9' }),
    buildUrlEntry({ loc: `${SITE_URL}/precios`, lastmod: today, changefreq: 'monthly', priority: '0.9' }),
    buildUrlEntry({ loc: `${SITE_URL}/servicios`, lastmod: today, changefreq: 'monthly', priority: '0.6' }),
    buildUrlEntry({ loc: `${SITE_URL}/blog`, lastmod: today, changefreq: 'weekly', priority: '0.8' }),
  ];

  const serviceEntries = SERVICE_PAGES.filter((service) => !service.noIndex).map((service) =>
    buildUrlEntry({
      loc: `${SITE_URL}/servicios/${service.slug}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.6',
    })
  );

  const trailingEntries = [
    buildUrlEntry({ loc: `${SITE_URL}/privacy`, lastmod: today, changefreq: 'yearly', priority: '0.3' }),
    buildUrlEntry({ loc: `${SITE_URL}/terms`, lastmod: today, changefreq: 'yearly', priority: '0.3' }),
  ];

  const allEntries = [...staticEntries, ...serviceEntries, ...postEntries, ...trailingEntries];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.join('\n')}
</urlset>
`;
}

async function main() {
  let postEntries = [];

  const { data, error } = await supabase
    .from('posts')
    .select('slug, created_at, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch published posts for sitemap generation:', error.message);
  } else if (data) {
    postEntries = data.map((post) =>
      buildUrlEntry({
        loc: `${SITE_URL}/blog/${post.slug}`,
        lastmod: formatDate(post.updated_at || post.created_at),
        changefreq: 'monthly',
        priority: '0.7',
      })
    );
  }

  const sitemap = buildSitemap(postEntries);
  writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
  console.log(`Generated sitemap.xml with ${postEntries.length} post URLs`);
}

main().catch((err) => {
  console.error('Unexpected error generating sitemap, writing static-only sitemap:', err);
  const sitemap = buildSitemap([]);
  writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
});
