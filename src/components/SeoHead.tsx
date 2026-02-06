import { useEffect } from 'react';
import { injectStructuredData, getBaseUrl } from '@/lib/structuredData';

const CANONICAL_ID = 'seo-canonical';
const OG_URL_ID = 'seo-og-url';

/**
 * Injects JSON-LD and canonical/og:url at runtime so they use the correct origin and base path.
 */
export default function SeoHead() {
  useEffect(() => {
    const cleanupJsonLd = injectStructuredData();

    const url = getBaseUrl();
    if (!url) return cleanupJsonLd;

    let linkCanonical = document.getElementById(CANONICAL_ID) as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.id = CANONICAL_ID;
      linkCanonical.rel = 'canonical';
      linkCanonical.href = url;
      document.head.appendChild(linkCanonical);
    } else {
      linkCanonical.href = url;
    }

    let metaOgUrl = document.getElementById(OG_URL_ID) as HTMLMetaElement | null;
    if (!metaOgUrl) {
      metaOgUrl = document.createElement('meta');
      metaOgUrl.id = OG_URL_ID;
      metaOgUrl.setAttribute('property', 'og:url');
      metaOgUrl.content = url;
      document.head.appendChild(metaOgUrl);
    } else {
      metaOgUrl.content = url;
    }

    return () => {
      cleanupJsonLd();
      document.getElementById(CANONICAL_ID)?.remove();
      document.getElementById(OG_URL_ID)?.remove();
    };
  }, []);

  return null;
}
