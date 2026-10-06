"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Layout";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="wide">
      <section
        aria-labelledby="error-title"
        className="flex min-h-[calc(100svh-var(--header-h))] flex-col justify-center border-b border-line-soft py-24 sm:py-32"
      >
        <Eyebrow accent>Something went wrong</Eyebrow>
        <h1 id="error-title" className="display-xl mt-6 max-w-[12ch]">
          A thread came <em>loose</em>.
        </h1>
        <p className="lead mt-7 max-w-md">Please try again. If it keeps happening, come back in a moment — your cart is saved.</p>
        <div className="mt-11 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>Try again</Button>
          <ButtonLink href="/" size="lg" variant="secondary">Back home</ButtonLink>
        </div>
        {error.digest && (
          <p className="mt-10 font-mono text-[12px] uppercase tracking-[0.08em] text-mute">Reference {error.digest}</p>
        )}
      </section>
    </Container>
  );
}
