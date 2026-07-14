import React from 'react';
import { Helmet } from 'react-helmet-async';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'NexCommit',
  url: 'https://nexcommit.com',
  logo: 'https://nexcommit.com/nexcommit-icon-v2.png',
  description: 'Plataforma innovadora que une a desarrolladores, empresas y visionarios para crear proyectos tecnológicos de alto impacto. Colabora, innova y transforma ideas en realidad.',
  slogan: 'Más que un proyecto, una alianza',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+56929237511',
    contactType: 'customer service',
    availableLanguage: 'Spanish',
  },
  sameAs: [
    'https://wa.me/56929237511',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'NexCommit',
  url: 'https://nexcommit.com',
  description: 'Plataforma de colaboración y desarrollo tecnológico que une a desarrolladores, empresas y visionarios.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://nexcommit.com/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
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
