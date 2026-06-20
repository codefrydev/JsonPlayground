/**
 * Shared site + route metadata for sitemap, llms.txt, and other static SEO files.
 * Keep in sync with src/config/routes.ts.
 */

export const SITE = {
  name: 'JSON Explorer',
  shortName: 'JSON Explorer',
  tagline: 'JSON Playground – Explore & Edit JSON',
  description:
    'Free JSON Explorer and Playground. Paste JSON, explore the tree, and run JavaScript snippets against your data in the browser. No sign-up.',
  baseUrl:
    process.env.SITEMAP_BASE_URL || 'https://codefrydev.in/JsonPlayground/',
  repo: 'https://github.com/codefrydev/JsonPlayground',
  issues: 'https://github.com/codefrydev/JsonPlayground/issues',
  live: 'https://codefrydev.in/JsonPlayground/',
  author: 'codefrydev',
  themeColor: '#0f172a',
  locale: 'en_US',
};

export const ROUTES = [
  {
    path: '/',
    title: 'JSON Explorer',
    description:
      'Explore, edit, and query JSON or XAML. Tree view, JavaScript execution, and instant conversion between formats.',
    section: 'Home',
  },
  {
    path: '/json',
    title: 'JSON Playground',
    description: 'Paste JSON, explore the tree, run JavaScript, and convert to XAML.',
    section: 'Playgrounds',
  },
  {
    path: '/xaml',
    title: 'XAML Playground',
    description: 'Edit XAML, view the tree, run JavaScript, and convert to JSON.',
    section: 'Playgrounds',
  },
  {
    path: '/yaml',
    title: 'YAML Playground',
    description: 'Edit YAML and view the parsed tree. Convert to JSON.',
    section: 'Playgrounds',
  },
  {
    path: '/csv',
    title: 'CSV Playground',
    description: 'Edit CSV, see table preview, and convert to JSON.',
    section: 'Playgrounds',
  },
  {
    path: '/toml',
    title: 'TOML Playground',
    description: 'Edit TOML and view the parsed tree. Convert to JSON.',
    section: 'Playgrounds',
  },
  {
    path: '/env',
    title: '.env Playground',
    description: 'Edit .env key=value and see JSON preview.',
    section: 'Playgrounds',
  },
  {
    path: '/jwt',
    title: 'JWT Playground',
    description: 'Decode a JWT or encode header and payload into a signed token.',
    section: 'Playgrounds',
  },
  {
    path: '/json-generator',
    title: 'JSON Generator',
    description:
      'Generate realistic mock JSON or CSV from a custom schema. Define fields, types, and blank rates — all in the browser.',
    section: 'Playgrounds',
  },
  {
    path: '/xaml-to-json',
    title: 'XAML to JSON',
    description: 'Paste XAML in one panel, see JSON output in the other.',
    section: 'Converters',
  },
  {
    path: '/json-to-xaml',
    title: 'JSON to XAML',
    description: 'Paste JSON in one panel, see XAML output in the other.',
    section: 'Converters',
  },
  {
    path: '/yaml-to-json',
    title: 'YAML to JSON',
    description: 'Paste YAML in one panel, see JSON output in the other.',
    section: 'Converters',
  },
  {
    path: '/json-to-yaml',
    title: 'JSON to YAML',
    description: 'Paste JSON in one panel, see YAML output in the other.',
    section: 'Converters',
  },
  {
    path: '/csv-to-json',
    title: 'CSV to JSON',
    description: 'Paste CSV in one panel, see JSON array in the other.',
    section: 'Converters',
  },
  {
    path: '/json-to-csv',
    title: 'JSON to CSV',
    description: 'Paste JSON array of objects, see CSV in the other panel.',
    section: 'Converters',
  },
  {
    path: '/toml-to-json',
    title: 'TOML to JSON',
    description: 'Paste TOML in one panel, see JSON in the other.',
    section: 'Converters',
  },
  {
    path: '/json-to-toml',
    title: 'JSON to TOML',
    description: 'Paste JSON object in one panel, see TOML in the other.',
    section: 'Converters',
  },
  {
    path: '/xml-to-json',
    title: 'XML to JSON',
    description: 'Paste XML in one panel, see JSON tree in the other.',
    section: 'Converters',
  },
  {
    path: '/json-to-xml',
    title: 'JSON to XML',
    description: 'Paste JSON in one panel, see XML in the other.',
    section: 'Converters',
  },
  {
    path: '/env-to-json',
    title: '.env to JSON',
    description: 'Paste .env in one panel, see JSON in the other.',
    section: 'Converters',
  },
  {
    path: '/json-to-env',
    title: 'JSON to .env',
    description: 'Paste JSON object in one panel, see .env in the other.',
    section: 'Converters',
  },
];

export function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

export function routeUrl(base, routePath) {
  const normalized = normalizeBaseUrl(base);
  if (routePath === '/') return normalized;
  return normalized.replace(/\/$/, '') + routePath;
}
