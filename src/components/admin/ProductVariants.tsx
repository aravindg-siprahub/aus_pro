"use client";

import { useMemo, useState } from "react";
import type { AdminVariant } from "@/lib/shopify/admin/types";
import { cn } from "@/lib/cn";
import { Badge, Panel, StockBadge, Table, Td, Th } from "./ui";
import { formatMoney } from "./format";

/** Option pickers (Size, Color…) that resolve to one variant, plus the full variant table. Data comes from the server. */
export function ProductVariants({ options, variants, truncated }: { options: { name: string; values: string[] }[]; variants: AdminVariant[]; truncated: boolean }) {
  const real = options.filter((o) => !(o.name === "Title" && o.values.length === 1 && o.values[0] === "Default Title"));
  const [chosen, setChosen] = useState<Record<string, string>>(() =>
    Object.fromEntries((variants[0]?.options ?? []).map((o) => [o.name, o.value])),
  );

  const selected = useMemo(
    () => variants.find((v) => real.every((o) => v.options.find((x) => x.name === o.name)?.value === chosen[o.name])) ?? null,
    [variants, real, chosen],
  );

  const exists = (name: string, value: string) =>
    variants.some((v) => v.options.find((x) => x.name === name)?.value === value && real.every((o) => o.name === name || v.options.find((x) => x.name === o.name)?.value === chosen[o.name]));

  return (
    <>
      {real.length > 0 && (
        <Panel title="Variant">
          <div className="space-y-4 px-5 py-4">
            {real.map((o) => (
              <fieldset key={o.name}>
                <legend className="mb-2 text-[13px] font-medium text-ink-2">{o.name}</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={o.name}>
                  {o.values.map((value) => {
                    const on = chosen[o.name] === value;
                    const possible = exists(o.name, value);
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setChosen((c) => ({ ...c, [o.name]: value }))}
                        className={cn(
                          "h-9 rounded-lg border px-3.5 text-[14px] transition-colors",
                          on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink",
                          !possible && !on && "text-mute/60 line-through",
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="rounded-lg bg-soft px-4 py-3 text-[14px]" aria-live="polite">
              {selected ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  <Item k="Price" v={formatMoney(selected.price)} />
                  <Item k="SKU" v={selected.sku ?? "—"} />
                  <div><dt className="text-[12px] text-mute">Inventory</dt><dd className="mt-1"><StockBadge inventory={selected.inventory} sellsWhenOutOfStock={selected.sellsWhenOutOfStock} /></dd></div>
                  <div><dt className="text-[12px] text-mute">For sale</dt><dd className="mt-1"><Badge tone={selected.availableForSale ? "green" : "red"}>{selected.availableForSale ? "Available" : "Unavailable"}</Badge></dd></div>
                </dl>
              ) : (
                <p className="text-mute">This combination doesn’t exist for the product.</p>
              )}
            </div>
          </div>
        </Panel>
      )}

      <Panel title={`Variants (${variants.length}${truncated ? "+" : ""})`}>
        <Table caption="Variants and inventory">
          <thead><tr><Th>Variant</Th><Th>SKU</Th><Th>Price</Th><Th>Inventory</Th><Th>For sale</Th></tr></thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className={cn(selected?.id === v.id && "bg-soft/60")}>
                <Td className="font-medium">{v.title === "Default Title" ? "Default" : v.title}</Td>
                <Td className="text-ink-2">{v.sku ?? <span className="text-mute">—</span>}</Td>
                <Td className="tabular-nums">{formatMoney(v.price)}</Td>
                <Td><StockBadge inventory={v.inventory} sellsWhenOutOfStock={v.sellsWhenOutOfStock} /></Td>
                <Td><Badge tone={v.availableForSale ? "green" : "red"}>{v.availableForSale ? "Yes" : "No"}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {truncated && <p className="border-t border-line-soft px-5 py-3 text-[13px] text-mute">Showing the first 100 variants.</p>}
      </Panel>
    </>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-[12px] text-mute">{k}</dt><dd className="mt-1 font-medium tabular-nums">{v}</dd></div>;
}
