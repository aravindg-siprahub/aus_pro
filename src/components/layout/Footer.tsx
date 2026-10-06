import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "@/components/ui/Layout";
import { categories } from "@/lib/commerce/mock-data";
import { getProviderMode } from "@/lib/commerce/server";

const cols = [
  {
    title: "Shop",
    links: [{ href: "/shop", label: "All pieces" }, ...categories.map((c) => ({ href: `/shop?category=${c.id}`, label: c.name }))],
  },
  {
    title: "Studio",
    links: [
      { href: "/customize", label: "Customise" },
      { href: "/collections", label: "Collections" },
      { href: "/authenticity", label: "Authenticity" },
      { href: "/about", label: "Our story" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/account", label: "Your orders" },
      { href: "/about#delivery", label: "Delivery" },
      { href: "/about#care", label: "Care guide" },
      { href: "/about#returns", label: "Returns" },
    ],
  },
];

export function Footer() {
  const demo = getProviderMode() === "mock";
  return (
    <footer className="mt-16 border-t border-line-soft text-[13px] text-mute">
      <Container size="wide" className="pb-10 pt-16 sm:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ink-2">
              A custom apparel studio. Premium essentials, printed one at a time with your words.
            </p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="eyebrow">{c.title}</h2>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-ink-2 transition-colors duration-300 hover:text-ink">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WAHAU{demo ? " · Demo catalogue, no real payments" : " · Secure checkout by Shopify"}</p>
          <p className="tracking-[0.04em]">Made to order · Printed by hand</p>
        </div>
      </Container>
    </footer>
  );
}
