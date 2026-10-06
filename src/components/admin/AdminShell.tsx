"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/connection", label: "Shopify connection" },
];

/** Sidebar on large screens, a slide-down menu on small ones. */
export function AdminShell({ children, storeName }: { children: ReactNode; storeName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-lg px-3 py-2 text-[14px] transition-colors", active ? "bg-soft font-medium text-ink" : "text-ink-2 hover:bg-soft/70 hover:text-ink")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-line-soft pt-3 text-[13px]">
      <Link href="/" className="block rounded-lg px-3 py-2 text-mute hover:bg-soft/70 hover:text-ink">View storefront ↗</Link>
      <button onClick={signOut} disabled={signingOut} className="block w-full rounded-lg px-3 py-2 text-left text-mute hover:bg-soft/70 hover:text-ink disabled:opacity-50">
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  return (
    // The admin is always light, whatever theme the storefront visitor chose.
    <div data-theme="light" className="min-h-screen bg-canvas lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line-soft bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-3 lg:py-4">
        <div>
          <div className="mb-5 px-3">
            <p className="text-[15px] font-semibold tracking-[-0.01em]">WAHAU</p>
            <p className="truncate text-[12px] text-mute" title={storeName}>{storeName}</p>
          </div>
          {nav}
        </div>
        {footer}
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-30 border-b border-line-soft bg-white lg:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <p className="text-[15px] font-semibold">WAHAU <span className="font-normal text-mute">Admin</span></p>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-menu" className="rounded-lg px-3 py-1.5 text-[14px] hover:bg-soft">
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open && (
          <div id="admin-menu" className="space-y-2 border-t border-line-soft px-3 pb-3 pt-2">
            {nav}
            {footer}
          </div>
        )}
      </div>

      <main id="admin-main" className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
