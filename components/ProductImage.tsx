"use client";

import { useState } from "react";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export default function ProductImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackClassName = "text-4xl text-blue-600",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className={fallbackClassName} aria-hidden>🏥</span>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
