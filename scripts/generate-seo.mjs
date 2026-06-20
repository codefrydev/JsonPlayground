/**
 * Generates sitemap.xml, llms.txt, llms-full.txt, and site.webmanifest.
 * Writes to public/ (dev) and dist/ (production build, when present).
 * Run after vite build. Set SITEMAP_BASE_URL for production base URL.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROUTES, SITE, normalizeBaseUrl, routeUrl } from './seo-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

const base = normalizeBaseUrl(SITE.baseUrl);
const basePath = new URL(base).pathname.replace(/\/$/, '') || '';
const manifestStartUrl = basePath ? `${basePath}/` : '/';
const lastmod = new Date().toISOString().slice(0, 10);

function writeOutputs(filename, content) {
  const targets = [path.join(publicDir, filename)];
  if (fs.existsSync(distDir)) {
    targets.push(path.join(distDir, filename));
  }
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
  console.log(`Wrote ${filename} → ${targets.join(', ')}`);
}

function buildSitemap() {
  const urls = ROUTES.map((route) => {
    const loc = routeUrl(base, route.path);
    const priority = route.path === '/' ? '1.0' : '0.8';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildLlmsTxt({ full = false } = {}) {
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `${SITE.name} is a free, client-side developer tool for exploring JSON, running JavaScript against your data, converting between formats, and generating mock data from custom schemas. Everything runs in the browser — no account or server upload required.`,
    '',
  ];

  if (full) {
    lines.push(
      '## Features',
      '',
      '- JSON tree explorer with path copy and autocomplete',
      '- JavaScript playground with `Dump()` output against your JSON',
      '- Shareable URLs and session restore via localStorage',
      '- Format converters: JSON, YAML, CSV, TOML, XML, XAML, and .env',
      '- JWT decode/encode playground',
      '- Mock JSON/CSV generator with visual schema editor',
      '',
    );
  }

  const sections = [...new Set(ROUTES.map((r) => r.section))];
  for (const section of sections) {
    lines.push(`## ${section}`, '');
    for (const route of ROUTES.filter((r) => r.section === section)) {
      lines.push(`- [${route.title}](${routeUrl(base, route.path)}): ${route.description}`);
    }
    lines.push('');
  }

  lines.push(
    '## Documentation',
    '',
    `- [Extended site guide for LLMs](${routeUrl(base, '/llms-full.txt')})`,
    `- [Sitemap](${routeUrl(base, '/sitemap.xml')})`,
    `- [humans.txt](${routeUrl(base, '/humans.txt')})`,
    '',
    '## Optional',
    '',
    `- [Live site](${SITE.live})`,
    `- [GitHub repository](${SITE.repo})`,
    `- [Report an issue](${SITE.issues})`,
    '',
  );

  return lines.join('\n');
}

function buildWebManifest() {
  const iconBase = basePath ? `${basePath}/` : '/';
  return `${JSON.stringify(
    {
      name: `${SITE.name} | ${SITE.tagline}`,
      short_name: SITE.shortName,
      description: SITE.description,
      start_url: manifestStartUrl,
      scope: manifestStartUrl,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: SITE.themeColor,
      lang: 'en',
      categories: ['developer', 'utilities', 'productivity'],
      icons: [
        {
          src: `${iconBase}favicon-32x32.png`,
          sizes: '32x32',
          type: 'image/png',
        },
      ],
    },
    null,
    2,
  )}\n`;
}

writeOutputs('sitemap.xml', buildSitemap());
writeOutputs('llms.txt', buildLlmsTxt());
writeOutputs('llms-full.txt', buildLlmsTxt({ full: true }));
writeOutputs('site.webmanifest', buildWebManifest());
