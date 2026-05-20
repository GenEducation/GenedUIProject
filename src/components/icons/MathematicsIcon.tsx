import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const MathematicsIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Calculator body */}
    <rect
      x="4"
      y="2"
      width="16"
      height="20"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Display screen */}
    <rect
      x="6"
      y="5"
      width="12"
      height="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Number pad - top row */}
    <circle cx="8" cy="11" r="1.2" fill="currentColor" />
    <circle cx="14" cy="11" r="1.2" fill="currentColor" />
    {/* Number pad - bottom row */}
    <circle cx="8" cy="15" r="1.2" fill="currentColor" />
    <circle cx="14" cy="15" r="1.2" fill="currentColor" />
    {/* Operation symbols */}
    <path d="M11 10.5v1M10.5 11h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M17 14.5v1M16.5 15h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
