/**
 * Route metadata for SEO, sitemap, and JSON-LD.
 * Single source of truth for path, title, and description per route.
 */

export const DEFAULT_TITLE = 'JSON Explorer | JSON Playground – Explore & Edit JSON';
export const DEFAULT_DESCRIPTION =
  'Free JSON Explorer and Playground. Paste JSON, explore the tree, and run JavaScript snippets against your data in the browser. No sign-up.';

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
}

export const ROUTE_META: RouteMeta[] = [
  {
    path: '/',
    title: 'JSON Explorer',
    description:
      'Explore, edit, and query JSON or XAML. Tree view, JavaScript execution, and instant conversion between formats.',
  },
  {
    path: '/json',
    title: 'JSON Playground',
    description: 'Paste JSON, explore the tree, run JavaScript, and convert to XAML.',
  },
  {
    path: '/xaml',
    title: 'XAML Playground',
    description: 'Edit XAML, view the tree, run JavaScript, and convert to JSON.',
  },
  {
    path: '/yaml',
    title: 'YAML Playground',
    description: 'Edit YAML and view the parsed tree. Convert to JSON.',
  },
  {
    path: '/csv',
    title: 'CSV Playground',
    description: 'Edit CSV, see table preview, and convert to JSON.',
  },
  {
    path: '/toml',
    title: 'TOML Playground',
    description: 'Edit TOML and view the parsed tree. Convert to JSON.',
  },
  {
    path: '/env',
    title: '.env Playground',
    description: 'Edit .env key=value and see JSON preview.',
  },
  {
    path: '/jwt',
    title: 'JWT Playground',
    description: 'Decode a JWT or encode header and payload into a signed token.',
  },
  {
    path: '/json-generator',
    title: 'JSON Generator',
    description:
      'Generate realistic mock JSON, CSV, or XML from a custom schema. Define fields, types, and blank rates — all in the browser.',
  },
  {
    path: '/xaml-to-json',
    title: 'XAML to JSON',
    description: 'Paste XAML in one panel, see JSON output in the other.',
  },
  {
    path: '/json-to-xaml',
    title: 'JSON to XAML',
    description: 'Paste JSON in one panel, see XAML output in the other.',
  },
  {
    path: '/yaml-to-json',
    title: 'YAML to JSON',
    description: 'Paste YAML in one panel, see JSON output in the other.',
  },
  {
    path: '/json-to-yaml',
    title: 'JSON to YAML',
    description: 'Paste JSON in one panel, see YAML output in the other.',
  },
  {
    path: '/csv-to-json',
    title: 'CSV to JSON',
    description: 'Paste CSV in one panel, see JSON array in the other.',
  },
  {
    path: '/json-to-csv',
    title: 'JSON to CSV',
    description: 'Paste JSON array of objects, see CSV in the other panel.',
  },
  {
    path: '/toml-to-json',
    title: 'TOML to JSON',
    description: 'Paste TOML in one panel, see JSON in the other.',
  },
  {
    path: '/json-to-toml',
    title: 'JSON to TOML',
    description: 'Paste JSON object in one panel, see TOML in the other.',
  },
  {
    path: '/xml-to-json',
    title: 'XML to JSON',
    description: 'Paste XML in one panel, see JSON tree in the other.',
  },
  {
    path: '/json-to-xml',
    title: 'JSON to XML',
    description: 'Paste JSON in one panel, see XML in the other.',
  },
  {
    path: '/env-to-json',
    title: '.env to JSON',
    description: 'Paste .env in one panel, see JSON in the other.',
  },
  {
    path: '/json-to-env',
    title: 'JSON to .env',
    description: 'Paste JSON object in one panel, see .env in the other.',
  },
];

/** Paths to include in sitemap (all public routes; exclude 404). */
export const SITEMAP_PATHS = ROUTE_META.map((r) => r.path);

/**
 * Returns route meta for the given pathname, or default title/description for unknown paths.
 */
export function getRouteMeta(pathname: string): { title: string; description: string } {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const route = ROUTE_META.find((r) => r.path === normalized);
  if (route) return { title: route.title, description: route.description };
  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
}

/**
 * Returns full page title for document.title (e.g. "JWT Playground | JSON Explorer").
 */
export function getPageTitle(pathname: string): string {
  const { title } = getRouteMeta(pathname);
  if (pathname === '/' || pathname === '') return DEFAULT_TITLE;
  return `${title} | JSON Explorer`;
}
