/* Student profile avatar illustration. Inlined (rather than a public/ asset)
 * so the backdrop circle color can follow the profile color picker. The
 * viewBox is cropped to the backdrop circle (center 332,318 r=300) so a
 * circular container clips it exactly. */
interface StudentAvatarIllustrationProps {
  bg: string;
}

export function StudentAvatarIllustration({ bg }: StudentAvatarIllustrationProps) {
  return (
    <svg viewBox="32 18 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <circle cx="332" cy="318" r="300" fill={bg} style={{ transition: "fill 0.2s" }} />
      <path d="M331.5 347.5C315 365.5 304.068 385.269 331.5 378.5" stroke="black" />
      <rect x="318" y="410" width="44" height="60" rx="6" fill="#F2794F" />
      <path d="M199.5 490.5C158.5 509 167.193 570.151 164.5 620H528.5C528.001 558.814 502 513.5 485 490.5C468 467.5 414.513 467.331 362.5 467.5L337.5 507L317 467.5C267.364 470.325 240.5 472 199.5 490.5Z" fill="#ECDFC3" stroke="black" />
      <path d="M363 467.5H317L337.5 506.5L363 467.5Z" fill="#F2794F" stroke="#F2794F" />
      <line x1="304.489" y1="468.102" x2="295.489" y2="511.102" stroke="black" />
      <line x1="294.781" y1="511.55" x2="331.781" y2="493.55" stroke="black" />
      <line x1="376.486" y1="466.884" x2="386.486" y2="508.884" stroke="black" />
      <line x1="386.824" y1="509.468" x2="346.824" y2="494.468" stroke="black" />
      <line x1="340.5" y1="507" x2="340.5" y2="618" stroke="black" />
      <path d="M350.5 410C346.924 422.484 339.716 430.046 318 444.5V410H350.5Z" fill="#161515" stroke="#F2794F" />
      <ellipse cx="347" cy="318" rx="95" ry="115" fill="#F2794F" />
      <path d="M347 365L351 369.5" stroke="black" />
      <ellipse cx="258" cy="330.5" rx="26" ry="39.5" fill="#F2794F" />
      <path d="M241 312L258.5 326" stroke="black" />
      <path d="M259.5 338L262.5 362" stroke="black" />
      <ellipse cx="435" cy="331" rx="26" ry="40" fill="#F2794F" />
      <path d="M438 326L446.5 314" stroke="black" />
      <path d="M434.5 331.5L432 360" stroke="black" />
      <path d="M257 276.241L260.5 323.741C260.5 323.741 281.5 298.241 283 276.241C284.5 254.241 303.5 243.741 324 249.741C344.5 255.741 348 255.241 373 249.741C398 244.241 407.858 253.651 415.5 276.241C423.142 298.83 435 323.741 435 323.741L440 269.241C431.364 245.495 423.117 234.562 401 220.241C379.94 207.733 367.662 203.031 343.5 205.741C325.144 206.181 315.236 209.835 298 220.241C278.35 235.537 269.212 247.506 257 276.241Z" fill="#1C1A1A" stroke="#201E1E" />
      <path d="M404 323.389C388.433 314.663 378.247 315.08 358 323.389" stroke="#201E1E" />
      <path d="M286.307 324C301.874 315.806 312.06 316.197 332.307 324" stroke="#201E1E" />
      <path d="M310.186 327.073C319.994 328.075 327.895 334.621 331.1 343.283C326.208 351.118 317.147 355.93 307.339 354.927C297.53 353.925 289.629 347.379 286.424 338.717C291.315 330.882 300.377 326.07 310.186 327.073Z" fill="#FFFAFA" />
      <ellipse cx="308.307" cy="341" rx="8" ry="14" fill="#161515" />
      <path d="M383.186 353.138C392.994 352.136 400.895 345.59 404.1 336.927C399.208 329.093 390.147 324.281 380.339 325.283C370.53 326.286 362.629 332.831 359.424 341.494C364.315 349.329 373.377 354.141 383.186 353.138Z" fill="#FFFAFA" />
      <ellipse cx="8" cy="14" rx="8" ry="14" transform="matrix(1 0 0 -1 373.307 353.211)" fill="#161515" />
      <path d="M338.307 338.5C333.054 350.226 331.495 355.837 332.807 363C334.563 367.619 336.802 368.725 341.807 369.5" stroke="black" />
      <path d="M342 390C351.047 389.601 355.425 387.771 361.5 380.5" stroke="black" />
      <rect x="252" y="210" width="190" height="70" rx="3" fill="#4A72D1" />
      <rect x="207" y="193" width="280" height="20" rx="10" fill="#4A72D1" />
      <path d="M468 210V256" stroke="black" strokeWidth="2" />
      <circle cx="467.5" cy="263.5" r="7.5" fill="#4A72D1" />
      <path d="M468 271L476.66 286H459.34L468 271Z" fill="#4A72D1" />
      <path d="M219.5 566.5V603M463 566.5V603" stroke="black" strokeWidth="2" />
    </svg>
  );
}
