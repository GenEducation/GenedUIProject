import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SocialScienceIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Globe outline */}
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Equator */}
    <path d="M3 12h18" stroke="currentColor" strokeWidth="0.8" />
    {/* Meridian ellipse */}
    <ellipse
      cx="12"
      cy="12"
      rx="4.5"
      ry="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
    />
    {/* Landmass hint */}
    <path
      d="M7 8.5c1.2-1 2.8-1 3.5 0s2 1 3 .3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);
