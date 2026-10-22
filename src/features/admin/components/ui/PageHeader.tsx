"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { sectionFor } from "../../adminNav";

/**
 * The top of every admin screen: the nav group as an eyebrow, the screen's
 * name, one line of context, and the screen's own actions on the right.
 *
 * Actions wrap under the title on a phone rather than squeezing it — a title
 * truncated to "Enrollm…" is worse than a second row of buttons. The eyebrow
 * defaults to the screen's nav group, so headers and sidebar never disagree.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const group = eyebrow ?? sectionFor(pathname).group.label;
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">{group}</p>
        <h1 className="font-serif text-[26px] font-bold leading-tight text-ink sm:text-[32px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-[14px] text-muted sm:text-[15px]">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}
