import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

// Leaf Icon matching reassurance note
export const LumaLeafIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

// 1. Compass / Direction / Conversation
export const LumaCompassIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <polygon points="15 9 13.5 13.5 9 15 10.5 10.5 15 9" />
  </svg>
);

// 2. Horizon / Journey
export const LumaHorizonIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 18h18" />
    <path d="M6 14a6 6 0 0 1 12 0" />
    <circle cx="12" cy="10" r="1" fill="currentColor" />
  </svg>
);

// 3. Caring / Health / Soft Organic Heart-Cross
export const LumaCaringIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

// 4. Voice Hero Microphone
export const LumaVoiceIcon: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

// 5. Circle of Light (Logo)
export const LumaLightRingIcon: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
  </svg>
);

// 6. Lotus / Serene Presence
export const LumaLotusIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4c2.5 3.5 2.5 7.5 0 11-2.5-3.5-2.5-7.5 0-11z" />
    <path d="M12 15c4.5-1 8-4.5 8-7-3.5 0-7 2.5-8 7z" />
    <path d="M12 15c-4.5-1-8-4.5-8-7 3.5 0 7 2.5 8 7z" />
    <path d="M4 19c4-1 12-1 16 0" />
  </svg>
);

// 7. Quiet Moon Wave (Night Mode)
export const LumaQuietMoonIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// 8. Minimal Check (Gentle done)
export const LumaCheckIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  size,
  strokeWidth = 1.5,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// 9. Feather / Air
export const LumaAirFeatherIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L3 13.5V21h7.5z" />
    <line x1="16" y1="8" x2="2" y2="22" />
    <line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
);

// 10. Minimal Plus / Add Moment
export const LumaPlusIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// 11. Profile / User Avatar Icon
export const LumaUserIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// 12. Arrow Right for clean navigational transitions
export const LumaArrowRightIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  size,
  strokeWidth = 1.5,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Sprig / new growth — used sparingly as a signature illustration for
// empty states, echoing "something is about to bloom" rather than "nothing here."
export const LumaSproutIcon: React.FC<IconProps> = ({
  className = 'w-12 h-12',
  size,
  strokeWidth = 1.25,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21C12 18 12 15.5 12 13C12 9.5 12.3 7 13 4.5" />
    <path d="M12 17C9.8 17.6 7.6 16.8 6.5 14.8C8.8 14.3 11 15.2 12 17Z" />
    <path d="M13 10C15.3 9.6 17.2 10.7 18 12.8C15.7 13 13.8 11.8 13 10Z" />
    <path d="M13 4.5C13.8 3.3 14.9 3 15.8 3.4C15.4 4.6 14.3 5.4 13 4.5Z" />
  </svg>
);


