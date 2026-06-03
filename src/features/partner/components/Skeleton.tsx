export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#1A3D2C]/[0.06] ${className}`}
    />
  );
}
