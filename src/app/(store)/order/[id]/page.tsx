import type { Metadata } from "next";
import { Container } from "@/components/ui/Layout";
import { OrderConfirmation } from "@/features/checkout/OrderConfirmation";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Container>
      <OrderConfirmation id={id} />
    </Container>
  );
}
