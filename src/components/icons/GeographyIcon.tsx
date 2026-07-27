import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const GeographyIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Compass ring */}
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    {/* Cardinal ticks */}
    <path
      d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.6"
    />
    {/* Compass needle */}
    <path
      d="M12 7l2 5-2 5-2-5 2-5Z"
      fill="currentColor"
      opacity="0.85"
    />
  </svg>
);
