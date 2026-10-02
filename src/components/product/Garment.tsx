"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Customization, GarmentType, PrintLocation } from "@/types/commerce";
import { edge, mix } from "@/lib/color";
import { fontById } from "@/features/customizer/config";

export type GarmentView = "front" | "back";

interface Anchor { x: number; y: number; rot: number; w: number; h: number }

interface Shape {
  body: string;
  seams: string[];
  anchors: Record<PrintLocation, Anchor>;
  sleeveScale: number;
}

const TEE: Shape = {
  body: "M138 46 C160 60 240 60 262 46 L352 92 L324 158 L284 138 L284 388 Q284 398 272 398 L128 398 Q116 398 116 388 L116 138 L76 158 L48 92 Z",
  seams: ["M116 138 L138 50", "M284 138 L262 50"],
  sleeveScale: 0.5,
  anchors: {
    front: { x: 200, y: 185, rot: 0, w: 112, h: 80 },
    back: { x: 200, y: 165, rot: 0, w: 130, h: 90 },
    "left-sleeve": { x: 314, y: 112, rot: 27, w: 44, h: 22 },
    "right-sleeve": { x: 86, y: 112, rot: -27, w: 44, h: 22 },
  },
};

const OVERSIZED: Shape = {
  body: "M134 46 C158 62 242 62 266 46 L368 104 L346 186 L304 164 L308 402 Q308 410 298 410 L102 410 Q92 410 92 402 L96 164 L54 186 L32 104 Z",
  seams: ["M96 164 L134 52", "M304 164 L266 52"],
  sleeveScale: 0.5,
  anchors: {
    front: { x: 200, y: 195, rot: 0, w: 128, h: 90 },
    back: { x: 200, y: 175, rot: 0, w: 150, h: 100 },
    "left-sleeve": { x: 322, y: 122, rot: 30, w: 48, h: 24 },
    "right-sleeve": { x: 78, y: 122, rot: -30, w: 48, h: 24 },
  },
};

const HOODIE: Shape = {
  body: "M142 56 C160 66 240 66 258 56 L336 100 L350 300 L306 304 L292 190 L292 388 Q292 398 282 398 L118 398 Q108 398 108 388 L108 190 L94 304 L50 300 L64 100 Z",
  seams: ["M108 190 L142 60", "M292 190 L258 60"],
  sleeveScale: 0.5,
  anchors: {
    front: { x: 200, y: 205, rot: 0, w: 104, h: 76 },
    back: { x: 200, y: 200, rot: 0, w: 130, h: 100 },
    "left-sleeve": { x: 322, y: 196, rot: 84, w: 100, h: 22 },
    "right-sleeve": { x: 78, y: 196, rot: -84, w: 100, h: 22 },
  },
};

const SHAPES: Record<GarmentType, Shape> = {
  "round-neck": TEE,
  polo: { ...TEE, anchors: { ...TEE.anchors, front: { x: 200, y: 215, rot: 0, w: 100, h: 70 } } },
  oversized: OVERSIZED,
  hoodie: HOODIE,
};

const BASE_FONT = { small: 20, medium: 30, large: 42 } as const;

interface GarmentProps {
  type: GarmentType;
  color: string;
  view?: GarmentView;
  customization?: Pick<Customization, "text" | "fontId" | "textColor" | "printSize" | "location">;
  /** Show a dashed guide where the print will go when there's no text yet. */
  showGuide?: boolean;
  zoom?: boolean;
  /** Animate the print in when its placement, size, font or colour changes. */
  animated?: boolean;
  className?: string;
  title?: string;
}

export function Garment({
  type,
  color,
  view = "front",
  customization,
  showGuide = false,
  zoom = false,
  animated = false,
  className,
  title,
}: GarmentProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const shape = SHAPES[type];
  const line = edge(color);
  const deep = edge(color, 0.3);
  const front = view === "front";

  const loc = customization?.location;
  const anchorRaw = loc ? shape.anchors[loc] : undefined;
  const isSleeve = loc === "left-sleeve" || loc === "right-sleeve";
  // Wearer's left sleeve appears on the viewer's right from the front, and mirrored from the back.
  const anchor =
    anchorRaw && isSleeve && !front
      ? { ...anchorRaw, x: 400 - anchorRaw.x, rot: -anchorRaw.rot }
      : anchorRaw;
  const printVisible =
    !!anchor && (loc === "back" ? !front : loc === "front" ? front : true);

  const text = customization?.text.trim() ?? "";
  let fontSize = 0;
  if (customization && text && anchor) {
    const f = fontById(customization.fontId);
    const base = BASE_FONT[customization.printSize] * (isSleeve ? shape.sleeveScale : 1);
    const fit = anchor.w / (text.length * f.widthFactor);
    fontSize = Math.max(6, Math.min(base, fit));
  }

  return (
    <svg
      viewBox={zoom ? "100 30 200 200" : "0 0 400 440"}
      role="img"
      aria-label={title ?? `${type} garment, ${front ? "front" : "back"} view`}
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
        <filter id={`${uid}-blur`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <ellipse cx="200" cy="420" rx="128" ry="9" fill="#000" opacity="0.14" filter={`url(#${uid}-blur)`} />

      {type === "hoodie" && front && (
        <path d="M136 60 C120 -6 280 -6 264 60 C240 82 160 82 136 60 Z" fill={mix(color, "#000", 0.12)} stroke={line} strokeWidth="1.5" />
      )}

      <path d={shape.body} fill={color} stroke={line} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={shape.body} fill={`url(#${uid}-sheen)`} />
      {shape.seams.map((d) => (
        <path key={d} d={d} fill="none" stroke={line} strokeWidth="1.2" opacity="0.7" />
      ))}

      {/* Hem + cuffs hints */}
      {type === "hoodie" ? (
        <>
          <path d="M108 378 L292 378" stroke={line} strokeWidth="1.2" opacity="0.7" />
          <path d="M50 300 L94 304 M306 304 L350 300" stroke={deep} strokeWidth="1.4" />
          {front ? (
            <>
              <path d="M150 60 C150 26 250 26 250 60 C232 78 168 78 150 60 Z" fill={mix(color, "#000", 0.32)} />
              <path d="M186 76 L184 128 M214 76 L216 128" stroke={mix(color, "#fff", 0.6)} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M138 296 L262 296 L278 356 L122 356 Z" fill="none" stroke={line} strokeWidth="1.3" />
            </>
          ) : (
            <path d="M146 58 C158 124 242 124 254 58" fill={mix(color, "#000", 0.1)} stroke={line} strokeWidth="1.3" />
          )}
        </>
      ) : (
        <>
          <path
            d={type === "oversized" ? "M96 392 L304 392" : "M116 384 L284 384"}
            stroke={line}
            strokeWidth="1.2"
            opacity="0.6"
          />
          {/* collar */}
          {type === "polo" ? (
            <>
              <path
                d={front ? "M140 47 L174 36 L206 96 L186 112 L150 72 Z" : "M144 46 Q200 70 256 46 L250 56 Q200 80 150 56 Z"}
                fill={mix(color, "#fff", 0.06)}
                stroke={deep}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              {front && (
                <>
                  <path d="M260 47 L226 36 L194 96 L214 112 L250 72 Z" fill={mix(color, "#fff", 0.1)} stroke={deep} strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M200 100 L200 172" stroke={deep} strokeWidth="1.4" />
                  <circle cx="200" cy="124" r="3.6" fill={mix(color, "#fff", 0.45)} stroke={deep} />
                  <circle cx="200" cy="150" r="3.6" fill={mix(color, "#fff", 0.45)} stroke={deep} />
                </>
              )}
            </>
          ) : (
            <path
              d={front ? "M140 47 Q200 116 260 47" : "M140 47 Q200 76 260 47"}
              fill="none"
              stroke={deep}
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}
        </>
      )}

      {/* Print */}
      {anchor && printVisible && (
        <g transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.rot})`}>
          <motion.g
            key={animated ? `${loc}-${view}-${customization!.printSize}-${customization!.fontId}-${customization!.textColor}-${!!text}` : "static"}
            initial={animated && !reduce ? { opacity: 0, scale: 0.9 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
          {text ? (
            <text
              key={`${customization!.fontId}`}
              textAnchor="middle"
              dominantBaseline="central"
              fill={customization!.textColor}
              fontSize={fontSize}
              style={{
                fontFamily: fontById(customization!.fontId).family,
                fontWeight: customization!.fontId === "sans" ? 700 : 500,
                letterSpacing: customization!.fontId === "condensed" ? "0.04em" : "-0.01em",
              }}
            >
              {text}
            </text>
          ) : showGuide ? (
            <g opacity="0.55">
              <rect x={-anchor.w / 2} y={-anchor.h / 2} width={anchor.w} height={anchor.h} rx="6" fill="none" stroke={edge(color, 0.5)} strokeWidth="1.2" strokeDasharray="4 4" />
              {!isSleeve && (
                <text textAnchor="middle" dominantBaseline="central" fontSize="11" fill={edge(color, 0.5)} style={{ fontFamily: "var(--font-inter)" }}>
                  Your text here
                </text>
              )}
            </g>
          ) : null}
          </motion.g>
        </g>
      )}
    </svg>
  );
}
