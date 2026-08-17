import React from 'react';

interface ColvirLogoProps {
  className?: string;
  alt?: string;
}

export const ColvirLogo: React.FC<ColvirLogoProps> = ({
  className = "h-9 sm:h-10",
  alt = "Colvir Software Solutions"
}) => {
  return (
    <img
      src="/colvir-logo.svg"
      alt={alt}
      className={`w-auto object-contain ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
