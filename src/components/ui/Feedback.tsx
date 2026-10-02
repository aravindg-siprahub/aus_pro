import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} aria-hidden />;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center sm:py-32">
      <h2 className="display-md">{title}</h2>
      {description && <p className="lead mt-3">{description}</p>}
      {children}
      {actionHref && actionLabel && (
        <ButtonLink href={actionHref} size="lg" className="mt-8">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  );
}

export function InlineError({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
      {children}
    </p>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl bg-[#fdf1ef] px-5 py-4 text-[15px] text-danger">
      {children}
    </div>
  );
}
