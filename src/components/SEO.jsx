import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'NexCommit - Convertimos ideas en plataformas con identidad',
  description = 'Integramos diseño, automatización y desarrollo a medida para que tu negocio avance con una marca coherente y una operación más sólida.',
  keywords = 'NexCommit, desarrollo web, automatización, diseño digital, plataformas a medida, desarrollo de apps, Chile, tecnología, innovación digital',
  ogImage = 'https://nexcommit.com/nexcommit-og-image.png',
  twitterImage = 'https://nexcommit.com/nexcommit-twitter-image.png',
  canonicalUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://nexcommit.com',
  type = 'website',
  noIndex = false,
  jsonLd = null,
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow" />}

      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:site_name" content="NexCommit" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={twitterImage} />

      {/* Structured Data (JSON-LD) */}
      {Array.isArray(jsonLd) && jsonLd.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
