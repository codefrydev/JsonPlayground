/**
 * Generates sitemap.xml into dist/ using the same paths as src/config/routes.ts.
 * Run after vite build. Set SITEMAP_BASE_URL for production (e.g. https://codefrydev.in/JsonPlayground/).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distPath = path.join(root, 'dist', 'sitemap.xml');

const BASE_URL =
  process.env.SITEMAP_BASE_URL || 'https://codefrydev.in/JsonPlayground/';
const base = BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/';

// Must match SITEMAP_PATHS in src/config/routes.ts
const PATHS = [
  '/',
  '/json',
  '/xaml',
  '/yaml',
  '/csv',
  '/toml',
  '/env',
  '/jwt',
  '/xaml-to-json',
  '/json-to-xaml',
  '/yaml-to-json',
  '/json-to-yaml',
  '/csv-to-json',
  '/json-to-csv',
  '/toml-to-json',
  '/json-to-toml',
  '/xml-to-json',
  '/json-to-xml',
  '/env-to-json',
  '/json-to-env',
];

const lastmod = new Date().toISOString().slice(0, 10);

const urls = PATHS.map((p) => {
  const loc = p === '/' ? base : base.replace(/\/$/, '') + p;
  const priority = p === '/' ? '1.0' : '0.8';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

fs.mkdirSync(path.dirname(distPath), { recursive: true });
fs.writeFileSync(distPath, sitemap, 'utf8');
console.log('Wrote', distPath);
