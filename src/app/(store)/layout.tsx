import { CartProvider } from "@/features/cart/CartProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteFade } from "@/components/layout/RouteFade";

/** The customer-facing storefront shell. The admin area has its own layout (see ../admin). */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <RouteFade />
    </CartProvider>
  );
}
