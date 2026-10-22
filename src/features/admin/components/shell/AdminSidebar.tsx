"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { GenEdLogo } from "@/components/shared/GenEdLogo";
import { NAV_GROUPS, isActiveHref } from "../../adminNav";
import { MAINTENANCE_COPY, isMaintenanceRoute } from "../../maintenance";

interface Props {
  pathname: string;
  onGated: (label: string) => void;
  onLogout: () => void;
  /**
   * "rail" collapses to icons between md and lg; "full" always shows labels —
   * the phone drawer, which has the width and nothing to collapse into.
   */
  mode: "rail" | "full";
  onNavigate?: () => void;
}

/**
 * Light shell sidebar, after the teacher portal's: paper surface, the active
 * screen lifted onto a white card with an ocean icon well.
 *
 * Live screens are links, so cmd-click and middle-click open them in a new tab.
 * Gated screens stay buttons: clicking one explains itself instead of moving.
 */
export function AdminSidebar({ pathname, onGated, onLogout, mode, onNavigate }: Props) {
  // In rail mode, labels exist only from lg up; in full mode, always.
  const show = mode === "rail" ? "hidden lg:block" : "block";
  const showFlex = mode === "rail" ? "hidden lg:flex" : "flex";
  const justify = mode === "rail" ? "justify-center lg:justify-start" : "justify-start";

  return (
    <div className="flex h-full flex-col">
      <div className={`flex flex-col gap-4 px-4 pt-5 ${mode === "rail" ? "lg:px-5" : ""}`}>
        <div className={`flex h-11 items-center ${justify}`}>
          {mode === "rail" ? (
            <>
              <span className="block lg:hidden">
                <GenEdLogo variant="mark" height={36} />
              </span>
              <span className="hidden lg:block">
                <GenEdLogo height={44} priority />
              </span>
            </>
          ) : (
            <GenEdLogo height={40} />
          )}
        </div>

        {/* Who is signed in lives in the top bar, which every width shows; here, just which portal this is. */}
        <p
          className={`px-1 text-[10px] font-bold uppercase leading-none tracking-widest text-ink/40 ${
            mode === "rail" ? "hidden lg:block" : ""
          }`}
        >
          Admin Console
        </p>
      </div>

      <nav aria-label="Admin sections" className="mt-4 flex-1 overflow-y-auto px-3 pb-4 lg:px-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi === 0 ? "" : "mt-4"}>
            <p
              className={`${show} px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40`}
            >
              {group.label}
            </p>
            {mode === "rail" ? (
              // A hairline stands in for the group label on the icon rail.
              gi === 0 ? null : <div aria-hidden className="mx-3 mb-2 h-px bg-border lg:hidden" />
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
                const gated = isMaintenanceRoute(item.href);
                const Icon = item.icon;
                const cls = `group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-all duration-200 ${justify} ${
                  active
                    ? "bg-white text-ink shadow-[0_4px_20px_rgba(18,45,48,.08)]"
                    : "text-muted hover:bg-white/70 hover:text-ink"
                }`;
                const body = (
                  <>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
                        active ? "bg-emerald text-white" : "group-hover:bg-ink/5"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className={`${show} min-w-0 flex-1 truncate text-[13px] font-bold`}>
                      {item.label}
                    </span>
                    {gated ? (
                      <span
                        className={`${showFlex} items-center rounded-full bg-warning-bg px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-warning-ink`}
                      >
                        Paused
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={item.href}>
                    {gated ? (
                      <button
                        type="button"
                        aria-label={item.label}
                        // aria-disabled, not disabled: a disabled button fires no
                        // click, and the whole point is that clicking explains itself.
                        aria-disabled
                        title={`${item.label} — ${MAINTENANCE_COPY.title}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => onGated(item.label)}
                        className={cls}
                      >
                        {body}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        aria-label={item.label}
                        title={item.label}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={cls}
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3 lg:px-4">
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className={`group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-muted transition-colors hover:text-danger ${justify}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] group-hover:bg-danger-bg">
            <LogOut size={16} />
          </span>
          <span className={`${show} text-[13px] font-bold`}>Sign out</span>
        </button>
      </div>
    </div>
  );
}
