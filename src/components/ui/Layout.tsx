import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8 lg:px-12",
        size === "narrow" && "max-w-[760px]",
        size === "default" && "max-w-[1200px]",
        size === "wide" && "max-w-[1440px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  id?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag className={cn("py-20 sm:py-28 lg:py-36", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Small tracked capitals above a headline. `accent` uses the gold, for section openers. */
export function Eyebrow({ children, className, accent = false }: { children: ReactNode; className?: string; accent?: boolean }) {
  return <p className={cn("eyebrow", accent && "!text-accent", className)}>{children}</p>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn("pb-10 pt-12 sm:pb-14 sm:pt-20", className)}>
      {eyebrow && <Eyebrow accent className="mb-5">{eyebrow}</Eyebrow>}
      <h1 className="display-lg max-w-[16ch]">{title}</h1>
      {description && <p className="lead mt-5 max-w-xl">{description}</p>}
      {children}
    </header>
  );
}
