import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ScienceIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Flask/Beaker - conical shape */}
    <path
      d="M8 3h8v5l4 8c0.4 0.8 -0.2 1.8 -1.2 1.8H5.2c-1 0 -1.6 -1 -1.2 -1.8l4 -8V3z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Liquid inside */}
    <path
      d="M9 12c0 2 1.3 3 3 3s3 -1 3 -3"
      fill="currentColor"
      opacity="0.2"
    />
    {/* Measurement marks on flask */}
    <path d="M8 8h8" stroke="currentColor" strokeWidth="0.8" />
    <path d="M8 11h8" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);
