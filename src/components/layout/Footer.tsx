import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "@/components/ui/Layout";
import { categories } from "@/lib/commerce/mock-data";

const cols = [
  {
    title: "Shop",
    links: [{ href: "/shop", label: "All products" }, ...categories.map((c) => ({ href: `/shop?category=${c.id}`, label: c.name }))],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "Our story" },
      { href: "/collections", label: "Collections" },
      { href: "/account", label: "Orders" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/about#delivery", label: "Delivery" },
      { href: "/about#care", label: "Care guide" },
      { href: "/about#returns", label: "Returns" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 bg-soft text-[13px] text-mute">
      <Container size="wide" className="py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo className="text-ink" />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed">
              Premium custom clothing, designed by you and made to order with care.
            </p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-[13px] font-semibold text-ink">{c.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors hover:text-ink">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Atelier Nine. Phase 1 prototype — demo data, no real payments.</p>
          <p>Privacy · Terms · Cookies</p>
        </div>
      </Container>
    </footer>
  );
}
