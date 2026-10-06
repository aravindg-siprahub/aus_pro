"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { InlineError } from "./Feedback";

/* ── Colour swatch (radio semantics) ── */
export function Swatch({
  hex,
  label,
  selected,
  onSelect,
  size = "md",
}: {
  hex: string;
  label: string;
  selected: boolean;
  onSelect?: () => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-7 w-7";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={cn(
        "grid place-items-center rounded-full transition-[box-shadow] duration-300 ease-[var(--ease-premium)]",
        size === "md" ? "h-11 w-11" : "h-7 w-7",
        selected ? "ring-1 ring-ink" : "ring-1 ring-transparent hover:ring-line",
      )}
    >
      {/* The inner edge keeps a near-black swatch visible on the dark canvas, and a white one on the light canvas */}
      <span className={cn("block rounded-full ring-1 ring-inset ring-ink/25", dim)} style={{ background: hex }} />
    </button>
  );
}

/** Static (non-interactive) colour dot for cards */
export function Dot({ hex, label }: { hex: string; label: string }) {
  return (
    <span
      title={label}
      className="inline-block h-3 w-3 rounded-full ring-1 ring-inset ring-ink/25"
      style={{ background: hex }}
    />
  );
}

/* ── Segmented options (radio semantics) ── */
export function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  columns,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; hint?: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  className?: string;
  columns?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", columns ?? "grid-cols-3", className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative flex min-h-12 flex-col items-center justify-center rounded-ui px-3 py-2 text-[14px] transition-[background-color,color,box-shadow] duration-300 ease-[var(--ease-premium)]",
              "disabled:cursor-not-allowed disabled:text-mute/60 disabled:line-through",
              on ? "bg-ink text-on-ink" : "text-ink ring-1 ring-inset ring-line hover:ring-ink disabled:hover:ring-line",
            )}
          >
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className={cn("text-[11px]", on ? "text-on-ink/70" : "text-mute")}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Quantity stepper ── */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const btn =
    "grid h-10 w-10 place-items-center text-lg text-ink transition-colors hover:bg-ink/[0.06] disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-ui ring-1 ring-inset ring-line">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        −
      </button>
      <span className="w-8 text-center text-[15px] tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}

/* ── Form fields ── */
interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
  id: string;
  className?: string;
}

export function Field({ label, error, hint, children, id, className }: FieldProps) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? <InlineError id={`${id}-err`}>{error}</InlineError> : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-ui bg-surface px-4 text-[16px] text-ink ring-1 ring-inset ring-line placeholder:text-mute " +
  "transition-shadow duration-200 hover:ring-ink/40 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink aria-[invalid=true]:ring-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...p },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...p} />;
});

/** The chevron is a mid-grey that reads on both themes (a data URL can't follow currentColor). */
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22><path d=%22M1 1.5l5 5 5-5%22 stroke=%22%238f897f%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/></svg>')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10", className)} {...p}>
      {children}
    </select>
  );
}
