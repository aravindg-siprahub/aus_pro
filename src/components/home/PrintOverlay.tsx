import type { FontId } from "@/types/commerce";
import { fontById } from "@/features/customizer/config";
import { cn } from "@/lib/cn";

export interface PrintSpot {
  /** Centre of the print, as a fraction of the photo frame. */
  x: number;
  y: number;
  /** Text size relative to the frame: width by default, or height with `unit: "cqh"`. */
  size: number;
  /** Use "cqh" when the frame's width changes but the photo's full height is always shown. */
  unit?: "cqw" | "cqh";
  rotate?: number;
}

/**
 * Text laid onto a garment photo, sized against its frame so it scales with the image.
 * The parent must be positioned; this fills it. With `animate`, each new text fades in (pure CSS,
 * so it never stalls and respects reduced motion).
 */
export function PrintOverlay({
  text,
  fontId,
  color,
  spot,
  animate = false,
  className,
}: {
  text: string;
  fontId: FontId;
  color: string;
  spot: PrintSpot;
  animate?: boolean;
  className?: string;
}) {
  const f = fontById(fontId);
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)} style={{ containerType: spot.unit === "cqh" ? "size" : "inline-size" }}>
      <span
        key={animate ? `${text}-${fontId}` : "static"}
        className={cn("absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap leading-none", animate && "print-in")}
        style={{
          left: `${spot.x * 100}%`,
          top: `${spot.y * 100}%`,
          fontFamily: f.family,
          fontWeight: fontId === "sans" ? 700 : 500,
          letterSpacing: fontId === "condensed" ? "0.04em" : "-0.01em",
          fontSize: `${spot.size}${spot.unit ?? "cqw"}`,
          color,
          rotate: spot.rotate ? `${spot.rotate}deg` : undefined,
          // Ink sits on cloth: a whisper of shadow keeps it from looking pasted on.
          textShadow: "0 0.5px 0.5px rgba(0,0,0,0.18)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
