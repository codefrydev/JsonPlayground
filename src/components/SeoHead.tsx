import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  injectStructuredData,
  getBaseUrl,
  getFullPageUrl,
} from '@/lib/structuredData';
import { getRouteMeta, getPageTitle } from '@/config/routes';

const CANONICAL_ID = 'seo-canonical';
const OG_URL_ID = 'seo-og-url';
const OG_TITLE_ID = 'seo-og-title';
const OG_DESCRIPTION_ID = 'seo-og-description';
const TWITTER_TITLE_ID = 'seo-twitter-title';
const TWITTER_DESCRIPTION_ID = 'seo-twitter-description';

function ensureMeta(
  id: string,
  attrs: { property?: string; name?: string }
): HTMLMetaElement {
  let el = document.getElementById(id) as HTMLMetaElement | null;
  if (el) return el;
  // Prefer updating existing meta from index.html to avoid duplicate tags
  if (attrs.property) {
    el = document.querySelector(`meta[property="${attrs.property}"]`) as HTMLMetaElement | null;
  } else if (attrs.name) {
    el = document.querySelector(`meta[name="${attrs.name}"]`) as HTMLMetaElement | null;
  }
  if (el) {
    el.id = id;
    return el;
  }
  el = document.createElement('meta');
  el.id = id;
  if (attrs.property) el.setAttribute('property', attrs.property);
  if (attrs.name) el.setAttribute('name', attrs.name);
  document.head.appendChild(el);
  return el;
}

/**
 * Injects JSON-LD and canonical/og/twitter meta at runtime per route.
 */
export default function SeoHead() {
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    const cleanupJsonLd = injectStructuredData(pathname);

    const baseUrl = getBaseUrl();
    if (!baseUrl) return cleanupJsonLd;

    const fullUrl = getFullPageUrl(pathname);
    const pageTitle = getPageTitle(pathname);
    const { title: metaTitle, description } = getRouteMeta(pathname);

    document.title = pageTitle;

    let linkCanonical = document.getElementById(CANONICAL_ID) as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.id = CANONICAL_ID;
      linkCanonical.rel = 'canonical';
      linkCanonical.href = fullUrl;
      document.head.appendChild(linkCanonical);
    } else {
      linkCanonical.href = fullUrl;
    }

    const metaOgUrl = ensureMeta(OG_URL_ID, { property: 'og:url' });
    metaOgUrl.content = fullUrl;

    const metaOgTitle = ensureMeta(OG_TITLE_ID, { property: 'og:title' });
    metaOgTitle.content = pathname === '/' ? pageTitle : `${metaTitle} | JSON Explorer`;

    const metaOgDescription = ensureMeta(OG_DESCRIPTION_ID, {
      property: 'og:description',
    });
    metaOgDescription.content = description;

    const metaTwitterTitle = ensureMeta(TWITTER_TITLE_ID, {
      name: 'twitter:title',
    });
    metaTwitterTitle.content = pathname === '/' ? pageTitle : `${metaTitle} | JSON Explorer`;

    const metaTwitterDescription = ensureMeta(TWITTER_DESCRIPTION_ID, {
      name: 'twitter:description',
    });
    metaTwitterDescription.content = description;

    return () => {
      cleanupJsonLd();
    };
  }, [pathname]);

  return null;
}
