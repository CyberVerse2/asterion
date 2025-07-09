import React from 'react';

export default function Spinner({
  className = '',
  size = 24
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-t-transparent border-primary ${className}`}
      style={{ width: size, height: size, borderWidth: size / 8 }}
      aria-label="Loading"
    />
  );
}
