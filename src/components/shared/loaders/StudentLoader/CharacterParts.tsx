import React from 'react';

const stroke = "#111827";
const sw = 2;

export const Head = () => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head shape */}
    
    {/* Black Hair / Hat base */}
    <circle cx="30" cy="30" r="18" fill="#111827" stroke={stroke} strokeWidth={sw} />
    
    {/* Face */}
    <circle cx="30" cy="35" r="14" fill="#FCD3A1" stroke={stroke} strokeWidth={sw} />
    
    {/* Eyes */}
    <circle cx="25" cy="33" r="1.5" fill={stroke} />
    <circle cx="35" cy="33" r="1.5" fill={stroke} />
    
    {/* Smile */}
    <path d="M 25 38 Q 30 42 35 38" stroke={stroke} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    
    {/* Ear */}
    <circle cx="16" cy="35" r="3" fill="#FCD3A1" stroke={stroke} strokeWidth={sw} />
  </svg>
);

export const Body = () => (
  <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="30" height="50" rx="10" fill="#FFFFFF" stroke={stroke} strokeWidth={sw} />
  </svg>
);

export const LeftArm = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 20 5 Q 20 25 35 25" stroke={stroke} strokeWidth={8} strokeLinecap="round" />
    <circle cx="35" cy="25" r="5" fill="#FCD3A1" stroke={stroke} strokeWidth={sw} />
  </svg>
);

export const RightArm = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 20 5 Q 20 5 5 25" stroke={stroke} strokeWidth={8} strokeLinecap="round" />
    <circle cx="5" cy="25" r="5" fill="#FCD3A1" stroke={stroke} strokeWidth={sw} />
  </svg>
);

export const LeftLeg = () => (
  <svg width="30" height="50" viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 15 0 L 15 30" stroke="#3B82F6" strokeWidth={6} strokeLinecap="round" />
    <rect x="5" y="30" width="25" height="12" rx="6" fill="#FFFFFF" stroke={stroke} strokeWidth={sw} />
  </svg>
);

export const RightLeg = () => (
  <svg width="30" height="50" viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 15 0 L 15 30" stroke="#2563EB" strokeWidth={6} strokeLinecap="round" />
    <rect x="5" y="30" width="25" height="12" rx="6" fill="#FFFFFF" stroke={stroke} strokeWidth={sw} />
  </svg>
);

export const Bag = () => (
  <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="30" height="45" rx="5" fill="#FBBF24" stroke={stroke} strokeWidth={sw} />
    <rect x="5" y="25" width="30" height="5" fill="#FDE68A" />
    <rect x="5" y="40" width="30" height="5" fill="#FDE68A" />
  </svg>
);
