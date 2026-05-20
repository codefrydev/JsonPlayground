/**
 * Builds and injects schema.org JSON-LD (WebApplication + WebSite + BreadcrumbList + WebPage) for SEO.
 * Uses origin + base path so it works for any deployment (e.g. /JsonPlayground/).
 */

import { getRouteMeta, ROUTE_META } from '@/config/routes';

const SCRIPT_ID = 'application-ld-json';

export function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
  const basePath = base ? `${base}/` : '/';
  return `${window.location.origin}${basePath}`;
}

/**
 * Returns the full URL for the current page (origin + base path + pathname).
 */
export function getFullPageUrl(pathname: string): string {
  const base = getBaseUrl();
  if (pathname === '/' || pathname === '') return base;
  return base.replace(/\/$/, '') + pathname;
}

function buildWebApplicationAndWebSite(): object[] {
  const url = getBaseUrl();
  const name = 'JSON Explorer';
  const description =
    'Free JSON Explorer and Playground. Paste JSON, explore the tree, and run JavaScript snippets against your data in the browser. No sign-up.';

  const webApplication = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Explore JSON in a tree view',
      'Run JavaScript snippets against your data',
      'Share state via URL',
    ],
  };

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description,
    url,
    publisher: {
      '@type': 'Organization',
      name: 'codefrydev',
    },
  };

  return [webApplication, webSite];
}

function buildBreadcrumbList(pathname: string): object | null {
  if (pathname === '/' || pathname === '') return null;
  const base = getBaseUrl();
  const items: { '@type': string; name: string; item?: string }[] = [
    { '@type': 'ListItem', name: 'Home', item: base },
  ];
  const pathSegments = pathname.split('/').filter(Boolean);
  let currentPath = '';
  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += '/' + pathSegments[i];
    const route = ROUTE_META.find((r) => r.path === currentPath);
    const name = route ? route.title : pathSegments[i];
    const itemUrl = base.replace(/\/$/, '') + currentPath;
    items.push({ '@type': 'ListItem', name, item: itemUrl });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

function buildWebPage(pathname: string): object | null {
  if (pathname === '/' || pathname === '') return null;
  const { title, description } = getRouteMeta(pathname);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: getFullPageUrl(pathname),
  };
}

/**
 * Builds all structured data graphs for the given pathname.
 */
export function buildStructuredData(pathname: string): object[] {
  const graphs = buildWebApplicationAndWebSite();
  const breadcrumb = buildBreadcrumbList(pathname);
  if (breadcrumb) graphs.push(breadcrumb);
  const webPage = buildWebPage(pathname);
  if (webPage) graphs.push(webPage);
  return graphs;
}

/**
 * Injects JSON-LD script(s) into document.head for the given pathname.
 * Returns a cleanup function that removes the script(s).
 */
export function injectStructuredData(pathname: string): () => void {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) existing.remove();

  const graphs = buildStructuredData(pathname);
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(graphs.length === 1 ? graphs[0] : graphs);
  document.head.appendChild(script);

  return () => {
    const el = document.getElementById(SCRIPT_ID);
    if (el) el.remove();
  };
}
