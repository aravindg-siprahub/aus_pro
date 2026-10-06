import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Playfair_Display, Caveat, Bebas_Neue, Space_Mono } from "next/font/google";
import "./globals.css";
import { ShopConfigSync } from "@/components/layout/ShopConfigSync";
import { getPublicShopConfig } from "@/lib/commerce/server";
import { DEFAULT_THEME, THEME_CHROME, THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// The display face for headlines: a clean, wide modern sans.
const display = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display-face", display: "swap" });
// Print typefaces offered in the customizer.
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "WAHAU — Custom apparel studio", template: "%s — WAHAU" },
  description: "Premium tees, polos and hoodies, designed by you and made to order.",
};

export const viewport: Viewport = { themeColor: THEME_CHROME[DEFAULT_THEME], width: "device-width", initialScale: 1 };

// Store settings (provider, currency, print prices) come from the server environment at request time,
// so pages are rendered per request rather than frozen at build time.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shopConfig = await getPublicShopConfig();
  return (
    // The theme attribute is set before paint by the inline script (a saved choice may differ from the default).
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${playfair.variable} ${caveat.variable} ${bebas.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ShopConfigSync config={shopConfig} />
        {children}
      </body>
    </html>
  );
}
