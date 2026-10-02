"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container>
      <div className="mx-auto flex max-w-md flex-col items-center py-32 text-center">
        <h1 className="display-md">Something went wrong.</h1>
        <p className="lead mt-3">Please try again. If it keeps happening, come back in a moment.</p>
        <Button size="lg" className="mt-8" onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
