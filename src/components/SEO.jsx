import React from 'react';
import { Helmet } from 'react-helmet';

const SEO = ({ 
  title = 'NexCommit - Más que un proyecto, una alianza',
  description = 'NexCommit es una plataforma innovadora que une a desarrolladores, empresas y visionarios para crear proyectos tecnológicos de alto impacto. Colabora, innova y transforma ideas en realidad.',
  keywords = 'NexCommit, colaboración, desarrollo tecnológico, proyectos, innovación, alianzas, desarrollo web, programación, startups, tecnología',
  ogImage = 'https://nomadlexis.com/nexcommit-og-image.png',
  twitterImage = 'https://nomadlexis.com/nexcommit-twitter-image.png',
  canonicalUrl = 'https://nomadlexis.com',
  type = 'website',
  noIndex = false
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
    </Helmet>
  );
};

export default SEO;
