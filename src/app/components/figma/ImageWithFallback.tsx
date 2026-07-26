import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string; // Prop para fallback, no se pasa al DOM
}

export function ImageWithFallback({ src, fallbackSrc, alt, className, ...rest }: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);

  const handleError = () => {
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt || 'Imagen'}
      className={className}
      onError={handleError}
      {...rest}
    />
  );
}