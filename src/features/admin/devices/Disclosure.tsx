import React from "react";
import { ChevronRight } from "lucide-react";

interface DisclosureProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * A thin accessible wrapper around semantic <details>/<summary>.
 */
export function Disclosure({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  className = "",
  children,
}: DisclosureProps) {
  return (
    <section>
      <details
        open={defaultOpen}
        className={`group rounded-xl border border-white/10 bg-white/[0.03] p-5 ${className}`}
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus:outline-none select-none">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              {badge}
            </div>
            {subtitle ? <p className="mt-0.5 text-xs text-white/40">{subtitle}</p> : null}
          </div>
          <ChevronRight
            size={16}
            className="shrink-0 text-white/40 transition-transform duration-200 group-open:rotate-90"
          />
        </summary>
        <div className="mt-4 border-t border-white/5 pt-4">{children}</div>
      </details>
    </section>
  );
}
