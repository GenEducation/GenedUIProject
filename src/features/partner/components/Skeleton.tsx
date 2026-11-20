export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#287624]/[0.06] ${className}`}
    />
  );
}
