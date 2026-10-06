"use client";

import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { VerifyForm } from "./VerifyForm";

/**
 * A button that opens the "Verify authenticity" modal. The dialog is a native <dialog> opened with
 * showModal(), so focus is trapped, Escape closes it and the page behind is inert. It is portalled to
 * <body> so a trigger inside a hidden or clipped container (a collapsed menu, a sticky header) still works.
 */
export function VerifyDialogTrigger({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name and tooltip, for an icon-only trigger. */
  label?: string;
}) {
  const titleId = useId();
  const descId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const [open, setOpen] = useState(false);
  // A fresh form each time the dialog opens.
  const [session, setSession] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input[name='serial']")?.focus();

    // Lock the page behind, keeping the scrollbar's space so nothing shifts.
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;
    const prev = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    root.style.overflow = "hidden";
    if (gap > 0) root.style.paddingRight = `${gap}px`;
    return () => {
      root.style.overflow = prev.overflow;
      root.style.paddingRight = prev.paddingRight;
    };
  }, [open, session]);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, []);

  // Fires for Escape, the close button and backdrop clicks alike.
  const onClose = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Only a press that both starts and ends on the backdrop closes (not a text selection dragged outside).
  const onMouseDown = (e: MouseEvent<HTMLDialogElement>) => {
    pressedOnBackdrop.current = e.target === e.currentTarget;
  };
  const onClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (pressedOnBackdrop.current && e.target === e.currentTarget) close();
    pressedOnBackdrop.current = false;
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        onClick={() => {
          setSession((s) => s + 1);
          setOpen(true);
        }}
      >
        {children}
      </button>

      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-describedby={descId}
            onClose={onClose}
            onMouseDown={onMouseDown}
            onClick={onClick}
            className="m-auto w-[calc(100%-2rem)] max-w-[560px] overflow-visible bg-transparent p-0 text-ink backdrop:bg-black/60"
          >
            <div
              className={
                "relative max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-tile border border-line bg-canvas " +
                "px-6 pb-8 pt-7 sm:px-10 sm:pb-11 sm:pt-10 " +
                "transition-[opacity,translate] duration-500 ease-[var(--ease-premium)] starting:opacity-0 starting:translate-y-2 motion-reduce:transition-none"
              }
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-ui text-mute transition-colors duration-300 hover:bg-ink/[0.06] hover:text-ink motion-reduce:transition-none sm:right-4 sm:top-4"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.25" />
                </svg>
              </button>

              <p className="eyebrow !text-accent">Authenticity</p>
              <h2 id={titleId} className="display-sm mt-4 pr-10">
                Verify authenticity
              </h2>
              <p id={descId} className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-ink-2">
                Enter the serial number stamped on your piece.
              </p>

              <VerifyForm key={session} className="mt-8" />

              <p className="mt-8 border-t border-line-soft pt-5 text-[13px] text-mute">
                No piece yet?{" "}
                <Link href="/authenticity" onClick={close} className="font-medium text-ink link-draw">
                  Try a sample serial on the authenticity page
                </Link>
              </p>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
