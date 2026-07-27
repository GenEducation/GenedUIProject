import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SocialPoliticalScienceIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Scales of civic justice */}
    <path d="M12 3.5v15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 19h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.5 6.5h6M13.5 6.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    {/* Left pan */}
    <path
      d="M4.5 6.5l-2 4a2 2 0 0 0 4 0l-2-4Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Right pan */}
    <path
      d="M19.5 6.5l-2 4a2 2 0 0 0 4 0l-2-4Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="3.5" r="1" fill="currentColor" opacity="0.6" />
  </svg>
);
