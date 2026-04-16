import React from 'react';

export function BrandAsset({ sources, alt, className }) {
  const [sourceIndex, setSourceIndex] = React.useState(0);
  const handleError = () => {
    setSourceIndex((currentIndex) => {
      if (currentIndex >= sources.length - 1) return currentIndex;
      return currentIndex + 1;
    });
  };
  return <img src={sources[sourceIndex]} alt={alt} className={className} onError={handleError} />;
}

export function BrandLogo({ compact = false }) {
  const sources = compact ? ['/nexcommit-icon-v2.png'] : ['/nexcommit-logo-inverse-v2.png'];
  return <BrandAsset sources={sources} alt="NexCommit" className={compact ? 'brand-mark' : 'brand-logo'} />;
}
