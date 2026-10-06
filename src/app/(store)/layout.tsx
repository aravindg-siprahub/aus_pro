import { CartProvider } from "@/features/cart/CartProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteFade } from "@/components/layout/RouteFade";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

/** The customer-facing storefront shell. The admin area has its own layout (see ../admin) and is always light. */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CartProvider>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <RouteFade />
      </CartProvider>
    </ThemeProvider>
  );
}
