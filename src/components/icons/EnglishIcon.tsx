import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const EnglishIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Book with pages */}
    <path
      d="M4 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Spine/pages divider */}
    <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Text lines on left page */}
    <path d="M6 8h4M6 11h5M6 14h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    {/* Text lines on right page */}
    <path d="M14 8h4M14 11h5M14 14h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
