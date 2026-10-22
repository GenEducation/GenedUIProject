"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Modal, type ModalSize } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "./EmptyState";

/**
 * Every admin form dialog: a titled header with a close button, a body that
 * scrolls on its own, and Cancel/Save pinned to the bottom — so on a phone the
 * buttons stay reachable however long the form is.
 */
export function FormModal({
  open = true,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = "Save",
  submitting = false,
  submitDisabled = false,
  error,
  size = "md",
  children,
  footer,
}: {
  open?: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  error?: string;
  size?: ModalSize;
  children: ReactNode;
  /** Replaces the default Cancel/Save row. */
  footer?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      title={title}
      className="max-h-[calc(100dvh-2rem)]"
      footer={
        footer ?? (
          <div className="flex justify-end gap-2.5 border-t border-border bg-paper px-5 py-4 sm:px-6">
            <Button variant="tertiary" onClick={onClose}>
              Cancel
            </Button>
            {onSubmit ? (
              <Button loading={submitting} disabled={submitDisabled} onClick={onSubmit}>
                {submitLabel}
              </Button>
            ) : null}
          </div>
        )
      }
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <p aria-hidden className="font-serif text-xl font-bold text-ink">{title}</p>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
      <div className="space-y-4 px-5 pb-6 pt-3 sm:px-6">
        {children}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </div>
    </Modal>
  );
}
