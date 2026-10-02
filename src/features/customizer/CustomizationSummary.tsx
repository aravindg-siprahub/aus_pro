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

export function CustomizationSummary({ customization, compact, className }: { customization: Customization; compact?: boolean; className?: string }) {
  const rows = customizationRows(customization);
  return (
    <dl className={cn("grid gap-x-6 text-[14px]", compact ? "grid-cols-1 gap-y-0.5" : "gap-y-2.5", className)}>
      {rows.map((r) => (
        <div key={r.k} className={cn("flex items-center", compact ? "gap-2" : "justify-between border-b border-line-soft pb-2.5 last:border-0 last:pb-0")}>
          <dt className="text-mute">{r.k}{compact && ":"}</dt>
          <dd className="flex items-center gap-2 font-medium text-ink">
            {r.swatch && <span className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/20" style={{ background: r.swatch }} />}
            {r.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
