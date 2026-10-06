"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button, TextLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AuthenticPiece, VerifyOutcome } from "@/lib/authenticity/types";

/** A serial as printed. Mirrors MAX_SERIAL_INPUT on the server without importing server code. */
const MAX_INPUT = 40;
const EXAMPLE = "WH-1001-1-7KQ4MX";

type Result =
  | VerifyOutcome
  | { status: "rate_limited" }
  | { status: "error" };

const issuedFormat = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
};

/**
 * "Enter a serial, get an answer." Talks only to /api/authenticity/verify; the key and the store never
 * reach the browser. Results are announced politely to screen readers.
 */
export function VerifyForm({
  initialSerial = "",
  autoVerify = false,
  autoFocus = false,
  className,
}: {
  initialSerial?: string;
  autoVerify?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const id = useId();
  const inputId = `${id}-serial`;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const reduce = useReducedMotion();

  const [serial, setSerial] = useState(initialSerial.slice(0, MAX_INPUT));
  const [checking, setChecking] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const abort = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const verify = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmpty(true);
      setResult(null);
      inputRef.current?.focus();
      return;
    }
    setEmpty(false);
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setChecking(true);
    try {
      const res = await fetch("/api/authenticity/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: trimmed }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      let next: Result;
      if (res.status === 429) next = { status: "rate_limited" };
      // A 400 means the input itself was unusable (too long, not text): the same advice as a wrong serial.
      else if (res.status === 400) next = { status: "invalid" };
      else if (!res.ok) next = { status: "error" };
      else {
        const body = (await res.json()) as Partial<VerifyOutcome>;
        next = body && typeof body.status === "string" && ["authentic", "void", "not_found", "invalid"].includes(body.status)
          ? (body as VerifyOutcome)
          : { status: "error" };
      }
      if (!ctrl.signal.aborted) setResult(next);
    } catch {
      if (!ctrl.signal.aborted) setResult({ status: "error" });
    } finally {
      if (abort.current === ctrl) {
        abort.current = null;
        setChecking(false);
      }
    }
  }, []);

  // A ?serial= link verifies straight away (once, even under Strict Mode's double effects).
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoVerify && initialSerial && !autoRan.current) {
      autoRan.current = true;
      void verify(initialSerial);
    }
  }, [autoVerify, initialSerial, verify]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => abort.current?.abort(), []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void verify(serial);
  }

  const describedBy = [hintId, empty ? errId : null].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <form onSubmit={onSubmit} noValidate aria-label="Verify a serial number">
        <label htmlFor={inputId} className="eyebrow mb-3 block">
          Serial number
        </label>
        <div className="flex gap-2 sm:gap-3">
          <input
            ref={inputRef}
            id={inputId}
            name="serial"
            type="text"
            value={serial}
            onChange={(e) => {
              setSerial(e.target.value.slice(0, MAX_INPUT));
              if (empty) setEmpty(false);
            }}
            maxLength={MAX_INPUT}
            placeholder={EXAMPLE}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="go"
            aria-describedby={describedBy}
            aria-invalid={empty || undefined}
            className={cn(
              "h-12 min-w-0 flex-1 rounded-ui bg-surface px-4 font-mono text-[16px] uppercase tracking-[0.08em] text-ink",
              "ring-1 ring-inset ring-line placeholder:text-mute/70 placeholder:tracking-[0.08em]",
              "transition-shadow duration-200 hover:ring-ink/40 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink",
              "aria-[invalid=true]:ring-danger motion-reduce:transition-none",
            )}
          />
          <Button type="submit" loading={checking} className="h-12 shrink-0 px-5 sm:px-7">
            {checking ? "Checking" : "Verify"}
          </Button>
        </div>
        {empty ? (
          <p id={errId} className="mt-3 text-[13px] text-danger">
            Enter the serial number stamped on your piece.
          </p>
        ) : null}
        <p id={hintId} className="mt-3 text-[13px] leading-relaxed text-mute">
          On the woven label inside the hem. It looks like <span className="font-mono tracking-[0.08em] text-ink-2">{EXAMPLE}</span>.
        </p>
      </form>

      <div aria-live="polite" aria-atomic="true" className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          {result && !checking && (
            <motion.div
              key={result.status === "authentic" ? `ok-${result.serial}` : result.status}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 border-t border-line-soft pt-7"
            >
              {result.status === "authentic" ? <Authentic serial={result.serial} piece={result.piece} /> : <NotVerified result={result} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Authentic({ serial, piece }: { serial: string; piece: AuthenticPiece }) {
  const issued = issuedFormat(piece.issuedAt);
  // Small facts sit in a two-column grid; the print, when there is one, gets its own featured block.
  const facts: { k: string; v: string }[] = [
    ...(piece.colour ? [{ k: "Colour", v: piece.colour }] : []),
    ...(piece.size ? [{ k: "Size", v: piece.size }] : []),
    ...(issued ? [{ k: "Issued", v: issued }] : []),
    { k: piece.quantity > 1 ? "Pieces in this line" : "Edition", v: piece.quantity > 1 ? String(piece.quantity) : "One of one" },
  ];
  const inkHex = piece.print?.ink?.match(/#[0-9a-f]{6}/i)?.[0];
  const inkName = piece.print?.ink?.replace(/\s*\(#[0-9a-f]{6}\)/i, "");

  return (
    <section aria-label="Verification result" className="bg-soft p-5 sm:p-7">
      {/* Certificate header: status seal, sample tag, serial */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success/15 text-success" aria-hidden>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
              <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-success">Authentic</p>
            <p className="mt-0.5 text-[13px] text-ink-2">Logged WAHAU piece</p>
          </div>
        </div>
        {piece.demo && (
          <span className="rounded-ui px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accent ring-1 ring-inset ring-accent/40">
            Sample
          </span>
        )}
      </div>

      <div className={cn("mt-6 grid items-center gap-4 sm:items-start sm:gap-7", piece.image && "grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)]")}>
        {piece.image && (
          <div className="relative aspect-[4/5] w-full self-start overflow-hidden rounded-tile bg-canvas sm:row-span-2">
            <Image src={piece.image.url} alt={piece.image.alt} fill sizes="(min-width: 640px) 150px, 84px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="break-words font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">{piece.product}</h3>
          <p className="mt-2 break-all font-mono text-[12px] tracking-[0.08em] text-mute sm:text-[13px]">{serial}</p>
        </div>

        {/* Under the photo and title on phones; beside the photo from tablets up */}
        <div className={cn("min-w-0", piece.image && "col-span-2 sm:col-span-1 sm:col-start-2")}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5">
            {facts.map((f) => (
              <div key={f.k} className="min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-mute">{f.k}</dt>
                <dd className="mt-1 break-words text-[15px] font-medium text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {piece.print && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-mute">Custom print</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <p className="break-words text-[22px] font-medium tracking-[-0.01em] text-ink">“{piece.print.text}”</p>
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
              {[piece.print.typeface, piece.print.placement, piece.print.size].filter(Boolean).join(" · ")}
              {inkHex && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>·</span>
                  <span className="inline-block h-3 w-3 rounded-full ring-1 ring-inset ring-ink/25" style={{ background: inkHex }} aria-hidden />
                  {inkName} ink
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {piece.productHandle && (
        <TextLink href={`/product/${encodeURIComponent(piece.productHandle)}`} className="mt-6">
          View this piece
        </TextLink>
      )}
    </section>
  );
}

const MESSAGES: Record<Exclude<Result["status"], "authentic">, { title: string; body?: string }> = {
  invalid: {
    title: "We couldn’t verify this serial.",
    body: "Check each character against the label inside the hem, including the dashes. A serial looks like WH-1001-1-7KQ4MX.",
  },
  void: {
    title: "This serial belongs to a cancelled order.",
    body: "The piece it names was never issued. If you were sold it as new, please contact us.",
  },
  not_found: {
    title: "This serial is well-formed but we have no record of it.",
    body: "Contact us with your order number and we’ll look into it.",
  },
  rate_limited: { title: "Too many attempts. Please wait a few minutes." },
  error: { title: "We couldn’t check that just now.", body: "Please try again in a moment." },
};

function NotVerified({ result }: { result: Exclude<Result, { status: "authentic" }> }) {
  const m = MESSAGES[result.status];
  const isProblem = result.status === "invalid" || result.status === "void";
  return (
    <section aria-label="Verification result">
      <p className={cn("flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em]", isProblem ? "text-danger" : "text-mute")}>
        <span aria-hidden className={cn("block h-1.5 w-1.5 rounded-full", isProblem ? "bg-danger" : "bg-mute")} />
        {result.status === "void" ? "Void" : result.status === "rate_limited" || result.status === "error" ? "Not checked" : "Not verified"}
      </p>
      <p className="mt-4 text-[17px] leading-snug text-ink">{m.title}</p>
      {m.body && <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">{m.body}</p>}
    </section>
  );
}
