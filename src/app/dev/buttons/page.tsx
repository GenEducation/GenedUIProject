"use client";

/**
 * Button system reference page — /dev/buttons.
 *
 * Renders every variant × size × state of the shared Button so the system can
 * be eyeballed and regression-checked without hunting for a screen that
 * happens to use a given combination. Lives under /dev alongside the pointer
 * harness; not linked from the app and not part of any user flow.
 */

import { Plus, Trash2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

const VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "tertiary",
  "destructive",
  "destructiveSolid",
];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <span className="w-40 shrink-0 text-xs font-semibold text-[var(--text-muted)]">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 text-sm font-bold tracking-tight text-[var(--primary-ink)]">{title}</h2>
      <div className="divide-y divide-[var(--surface-border)]">{children}</div>
    </section>
  );
}

export default function ButtonGalleryPage() {
  const [loadingDemo, setLoadingDemo] = useState(false);

  return (
    <main className="mx-auto max-w-4xl px-8 py-12" style={{ fontFamily: "var(--font-body)" }}>
      <h1 className="mb-1 text-2xl font-bold text-[var(--primary-ink)]">Button system</h1>
      <p className="mb-10 text-sm text-[var(--text-mid)]">
        Tab through the page to check focus rings; hover and press to check state transitions.
      </p>

      <Section title="Variants × sizes">
        {VARIANTS.map((v) => (
          <Row key={v} label={v}>
            {SIZES.map((s) => (
              <Button key={s} variant={v} size={s}>
                {s.toUpperCase()} action
              </Button>
            ))}
          </Row>
        ))}
      </Section>

      <Section title="States">
        <Row label="default / hover / active">
          <Button variant="primary">Save changes</Button>
        </Row>
        <Row label="disabled">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v} disabled>
              Disabled
            </Button>
          ))}
        </Row>
        <Row label="loading">
          {SIZES.map((s) => (
            <Button key={s} size={s} loading>
              Saving changes
            </Button>
          ))}
        </Row>
        <Row label="loading (toggle)">
          <Button
            loading={loadingDemo}
            onClick={() => {
              setLoadingDemo(true);
              setTimeout(() => setLoadingDemo(false), 1800);
            }}
          >
            Click to submit
          </Button>
          <span className="text-xs text-[var(--text-muted)]">width must not jump</span>
        </Row>
      </Section>

      <Section title="Modifiers">
        <Row label="with icons">
          <Button leadingIcon={<Plus size={16} />}>Create account</Button>
          <Button variant="secondary" trailingIcon={<ArrowRight size={16} />}>
            Continue
          </Button>
          <Button variant="destructive" leadingIcon={<Trash2 size={14} />} size="sm">
            Delete
          </Button>
        </Row>
        <Row label="iconOnly">
          {SIZES.map((s) => (
            <Button key={s} iconOnly size={s} variant="tertiary" aria-label={`Add (${s})`}>
              <Plus size={s === "sm" ? 14 : s === "md" ? 16 : 18} />
            </Button>
          ))}
        </Row>
        <Row label="pill">
          <Button pill size="sm">
            Active filter
          </Button>
          <Button pill size="sm" variant="tertiary">
            Inactive filter
          </Button>
        </Row>
        <Row label="fullWidth">
          <div className="w-full max-w-sm">
            <Button fullWidth size="lg">
              Continue to GenEd
            </Button>
          </div>
        </Row>
      </Section>

      <Section title='tone="onDark"'>
        <div className="rounded-2xl bg-[#0E1F2B] p-6">
          <div className="flex flex-wrap items-center gap-3">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v} tone="onDark">
                {v}
              </Button>
            ))}
            <Button iconOnly variant="tertiary" tone="onDark" aria-label="Delete row">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </Section>
    </main>
  );
}
