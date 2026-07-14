import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

/**
 * Breadcrumbs — visual trail + BreadcrumbList JSON-LD schema.
 *
 * @param {{ items: Array<{ label: string, path?: string }> }} props
 *   items — ordered breadcrumb trail. The last item should omit `path`
 *   since it represents the current page (not a link).
 */
export default function Breadcrumbs({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.path ? { item: `https://nexcommit.com${item.path}` } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-brand-muted">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">/</span>}
                {isLast || !item.path ? (
                  <span className="text-white" aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.path} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
