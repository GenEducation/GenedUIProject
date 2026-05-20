import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const HindiIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Book shape */}
    <path
      d="M4 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Spine divider */}
    <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

    {/* Devanagari-inspired script marks on left */}
    <path
      d="M6 8c1 0 1.5 0.5 1 1M6 10h1.5M6 12h1"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Devanagari-inspired script marks on right */}
    <path
      d="M14 8h1.5c0.5 0 0.8 0.5 0.5 1M14 10h1.5M14 12h1"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Bottom accent line (Devanagari shiro rekha style) */}
    <path d="M6 14h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
