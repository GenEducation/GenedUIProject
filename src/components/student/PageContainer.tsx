"use client";

interface PageContainerProps {
  children: React.ReactNode;
  /** "default" = max-w-5xl (Schedule's current width, the new baseline).
   * "wide" = max-w-7xl, for card grids that need the extra room (Practice). */
  width?: "default" | "wide";
  className?: string;
}

export function PageContainer({ children, width = "default", className = "" }: PageContainerProps) {
  // No padding here on purpose — every call site already scrolls inside its
  // own padded container (e.g. `p-4 sm:p-6 md:p-8` on the scrollable body).
  // This only owns the max-width + centering, so it composes with whatever
  // spacing (space-y-*, etc.) the caller passes via `className`.
  const maxWidth = width === "wide" ? "max-w-7xl" : "max-w-5xl";
  return (
    <div className={`mx-auto w-full ${maxWidth} ${className}`}>
      {children}
    </div>
  );
}
