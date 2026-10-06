import type { Customization } from "@/types/commerce";
import { cn } from "@/lib/cn";
import { colorName, fontById, locationLabel, sizeLabel } from "./config";

export function customizationRows(c: Customization) {
  return [
    { k: "Text", v: `“${c.text}”` },
    { k: "Font", v: fontById(c.fontId).label },
    { k: "Colour", v: colorName(c.textColor), swatch: c.textColor },
    { k: "Print size", v: sizeLabel(c.printSize) },
    { k: "Placement", v: locationLabel(c.location) },
  ];
}

/**
 * The print details as a definition list. Full: hairline-separated rows, label left and value right.
 * Compact (bag, checkout, order lines): quiet "Label  Value" lines.
 */
export function CustomizationSummary({ customization, compact, className }: { customization: Customization; compact?: boolean; className?: string }) {
  const rows = customizationRows(customization);
  return (
    <dl className={cn("grid", compact ? "gap-y-1 text-[13px]" : "text-[14px]", className)}>
      {rows.map((r) => (
        <div
          key={r.k}
          className={cn(
            "flex min-w-0",
            compact ? "items-baseline gap-3" : "items-center justify-between gap-6 border-b border-line-soft py-3 first:pt-0 last:border-0 last:pb-0",
          )}
        >
          <dt className={cn("shrink-0 text-mute", compact && "w-[5.5rem]")}>{r.k}</dt>
          <dd className={cn("flex min-w-0 items-center gap-2 text-ink", compact ? "" : "font-medium")}>
            {r.swatch && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/25" style={{ background: r.swatch }} />}
            <span className="min-w-0 break-words">{r.v}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
