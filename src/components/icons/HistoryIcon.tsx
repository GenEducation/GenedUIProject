import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const HistoryIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* Hourglass frame */}
    <path
      d="M7 3.5h10M7 20.5h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7.5 3.5c0 3.2 1.6 5.3 4.5 6.8 2.9-1.5 4.5-3.6 4.5-6.8M7.5 20.5c0-3.2 1.6-5.3 4.5-6.8 2.9 1.5 4.5 3.6 4.5 6.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Falling sand */}
    <path d="M12 10.8v2.4" stroke="currentColor" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
    {/* Clock hint / past marker */}
    <circle cx="12" cy="9" r="1" fill="currentColor" opacity="0.5" />
  </svg>
);
