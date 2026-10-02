import { EmptyState } from "@/components/ui/Feedback";
import { Container } from "@/components/ui/Layout";

export default function NotFound() {
  return (
    <Container>
      <EmptyState title="We couldn’t find that page." description="It may have moved, or never existed." actionHref="/shop" actionLabel="Back to shop" />
    </Container>
  );
}
