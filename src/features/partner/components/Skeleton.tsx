export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#075E63]/[0.06] ${className}`}
    />
  );
}
