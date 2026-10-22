"use client";

import { ChevronRight, Menu } from "lucide-react";
import { GenEdLogo } from "@/components/shared/GenEdLogo";
import { sectionFor } from "../../adminNav";
import { Avatar } from "../ui/Avatar";

/**
 * Sticky bar over the content: where you are (group › screen) and who is
 * signed in. Below md it also carries the menu button, because the sidebar
 * has moved into a drawer.
 */
export function AdminTopBar({
  pathname,
  adminName,
  onOpenMenu,
}: {
  pathname: string;
  adminName: string;
  onOpenMenu: () => void;
}) {
  const { group, item } = sectionFor(pathname);
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-ink/5 md:hidden"
        >
          <Menu size={20} />
        </button>
        <span className="md:hidden">
          <GenEdLogo variant="mark" height={28} />
        </span>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span className="hidden font-semibold text-muted sm:inline">{group.label}</span>
          <ChevronRight size={14} className="hidden shrink-0 text-muted-light sm:block" />
          <span className="truncate font-bold text-ink">{item.label}</span>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden text-right sm:block">
            <span className="block text-[12.5px] font-bold leading-tight text-ink">{adminName}</span>
            <span className="block text-[10.5px] leading-tight text-muted">Administrator</span>
          </span>
          <Avatar name={adminName} size={32} />
        </div>
      </div>
    </div>
  );
}
