import type { Metadata } from "next";
import { Container } from "@/components/ui/Layout";
import { CartView } from "@/features/cart/CartView";

export const metadata: Metadata = { title: "Bag" };

export default function CartPage() {
  return (
    <Container>
      <CartView />
    </Container>
  );
}
