import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Caveat, Bebas_Neue, Space_Mono } from "next/font/google";
import "./globals.css";
import { ShopConfigSync } from "@/components/layout/ShopConfigSync";
import { getPublicShopConfig } from "@/lib/commerce/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Atelier Nine — Premium custom clothing", template: "%s — Atelier Nine" },
  description: "Premium tees, polos and hoodies, designed by you and made to order.",
};

export const viewport: Viewport = { themeColor: "#fbfbfd", width: "device-width", initialScale: 1 };

// Store settings (provider, currency, print prices) come from the server environment at request time,
// so pages are rendered per request rather than frozen at build time.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shopConfig = await getPublicShopConfig();
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${caveat.variable} ${bebas.variable} ${mono.variable}`}>
      <body>
        <ShopConfigSync config={shopConfig} />
        {children}
      </body>
    </html>
  );
}
