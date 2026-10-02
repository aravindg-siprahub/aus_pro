import type { CartItem } from "@/types/commerce";
import { Garment } from "./Garment";
import { cn } from "@/lib/cn";

export function CartThumb({ item, className }: { item: CartItem; className?: string }) {
  const view = item.customization?.location === "back" ? "back" : "front";
  return (
    <div className={cn("shrink-0 rounded-2xl bg-soft p-[9%]", className)}>
      <Garment
        type={item.category}
        color={item.colorHex}
        view={view}
        customization={item.customization}
        className="h-full w-full"
        title={`${item.title} in ${item.colorName}`}
      />
    </div>
  );
}
