import React from 'react';
import { Helmet } from 'react-helmet-async';

// One entity for the whole site. ProfessionalService (a LocalBusiness subtype)
// lets Google tie the site to the Google Business Profile and show it for
// "empresa de páginas web" style searches; areaServed = Chile because the
// business is remote and serves the whole country (no street address shown).
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': 'https://www.nexcommit.com/#organization',
  name: 'NexCommit',
  url: 'https://www.nexcommit.com/',
  logo: 'https://www.nexcommit.com/icon-512.png',
  image: 'https://www.nexcommit.com/nexcommit-og-image.png',
  description:
    'Agencia chilena de desarrollo de páginas web, tiendas online, aplicaciones a medida, automatización y chatbots con inteligencia artificial para empresas.',
  slogan: 'Más que un proyecto, una alianza',
  telephone: '+56929237511',
  priceRange: '$$',
  areaServed: { '@type': 'Country', name: 'Chile' },
  address: { '@type': 'PostalAddress', addressCountry: 'CL' },
  knowsAbout: [
    'Diseño de páginas web',
    'Desarrollo web a medida',
    'Landing pages',
    'Tiendas online',
    'Chatbots con inteligencia artificial',
    'Automatización de procesos',
    'Aplicaciones web',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+56929237511',
    contactType: 'sales',
    areaServed: 'CL',
    availableLanguage: 'Spanish',
  },
  sameAs: ['https://wa.me/56929237511'],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://www.nexcommit.com/#website',
  name: 'NexCommit',
  url: 'https://www.nexcommit.com/',
  inLanguage: 'es-CL',
  publisher: { '@id': 'https://www.nexcommit.com/#organization' },
};

// Always-on site-wide metadata: structured data and Apple mobile web app
// tags. Rendered once outside <Routes> so it applies to every route
// regardless of which page-level <SEO> is also rendered. The manifest
// link lives statically in index.html since it never varies per route.
const SiteMeta = () => {
  return (
    <Helmet>
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="NexCommit" />
      <meta name="format-detection" content="telephone=no" />

      <script type="application/ld+json">
        {JSON.stringify(organizationJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteJsonLd)}
      </script>
    </Helmet>
  );
};

export default SiteMeta;
