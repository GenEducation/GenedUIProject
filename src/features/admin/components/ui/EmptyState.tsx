"use client";

import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  bare = false,
}: {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  /** Drop the dashed card, for use inside a container that already has one. */
  bare?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-14 text-center ${
        bare ? "" : "rounded-2xl border border-dashed border-border bg-white"
      }`}
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/60">
        <Icon size={24} />
      </span>
      <p className="font-serif text-lg font-bold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/25 bg-danger-bg px-4 py-3 text-sm font-medium text-danger-ink"
    >
      {children}
    </div>
  );
}
