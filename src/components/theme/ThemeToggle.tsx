"use client";

import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/cn";

/** A half-filled disc that turns over between the two themes. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "group grid h-10 w-10 place-items-center text-ink-2 transition-colors duration-300 hover:text-ink",
        className,
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={cn(
          "transition-transform duration-700 ease-[var(--ease-premium)] motion-reduce:transition-none",
          theme === "light" && "rotate-180",
        )}
      >
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3.75a8.25 8.25 0 0 1 0 16.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
