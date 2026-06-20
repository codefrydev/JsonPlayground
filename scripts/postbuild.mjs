/**
 * Post-build: SPA 404 fallback for GitHub Pages + verify production index.html.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('postbuild: dist/index.html missing — run vite build first');
  process.exit(1);
}

let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Absolute favicon so /json, /xaml, etc. (nested index.html copies) don't resolve to /json/favicon...
const basePath = process.env.BASE_PATH || '/';
const base =
  basePath === '/' ? '/' : basePath.endsWith('/') ? basePath : `${basePath}/`;
indexHtml = indexHtml.replace(
  /href="(\.\/)?favicon-32x32\.png"/,
  `href="${base}favicon-32x32.png"`,
);

if (indexHtml.includes('/src/main.tsx')) {
  console.error(
    'postbuild: dist/index.html still references /src/main.tsx — production build failed.\n' +
      'Set BASE_PATH when building (e.g. BASE_PATH=/JsonPlayground/ npm run build).',
  );
  process.exit(1);
}

if (!indexHtml.includes('/assets/') && !indexHtml.match(/src="[^"]+\.js"/)) {
  console.error('postbuild: dist/index.html has no bundled JS asset — check vite build.');
  process.exit(1);
}

const faviconPath = `${base}favicon-32x32.png`;
if (!indexHtml.includes(faviconPath)) {
  console.error(`postbuild: dist/index.html missing favicon href ${faviconPath}`);
  process.exit(1);
}

fs.writeFileSync(indexPath, indexHtml);

// GitHub Pages SPA fallback
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

// Static hosts (e.g. codefrydev.in/JsonPlayground/ under a parent site) often lack SPA
// rewrites — copy index.html into each route folder so /json, /xaml, etc. load the app.
const ROUTE_PATHS = [
  '/json',
  '/xaml',
  '/yaml',
  '/csv',
  '/toml',
  '/env',
  '/jwt',
  '/json-generator',
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

for (const route of ROUTE_PATHS) {
  const dir = path.join(distDir, route.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), indexHtml);
}

console.log('postbuild: copied index.html → 404.html (GitHub Pages SPA fallback)');
console.log(`postbuild: copied index.html into ${ROUTE_PATHS.length} route folders`);
console.log('postbuild: production index.html OK');
