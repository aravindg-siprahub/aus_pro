import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-tile", className)} aria-hidden />;
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
      {description && <p className="lead mt-4">{description}</p>}
      {children}
      {actionHref && actionLabel && (
        <ButtonLink href={actionHref} size="lg" className="mt-9">
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
    <div role="alert" className="border-l-2 border-danger bg-danger/10 px-5 py-4 text-[15px] text-ink">
      {children}
    </div>
  );
}
