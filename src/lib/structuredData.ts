/**
 * Builds and injects schema.org JSON-LD (WebApplication + WebSite) for SEO.
 * Uses origin + base path so it works for any deployment (e.g. /JsonPlayground/).
 */

const SCRIPT_ID = 'application-ld-json';

export function getBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
  const basePath = base ? `${base}/` : '/';
  return `${window.location.origin}${basePath}`;
}

export function buildStructuredData(): object[] {
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

/**
 * Injects JSON-LD script(s) into document.head. Returns a cleanup function that removes the script(s).
 */
export function injectStructuredData(): () => void {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) existing.remove();

  const graphs = buildStructuredData();
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
