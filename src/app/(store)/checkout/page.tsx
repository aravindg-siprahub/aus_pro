import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Layout";
import { Checkout } from "@/features/checkout/Checkout";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <Container>
      <PageHeader title="Checkout." />
      <Checkout />
    </Container>
  );
}
