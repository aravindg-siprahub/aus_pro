import { ButtonLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Layout";

export default function NotFound() {
  return (
    <Container size="wide">
      <section
        aria-labelledby="not-found-title"
        className="flex min-h-[calc(100svh-var(--header-h))] flex-col justify-center border-b border-line-soft py-24 sm:py-32"
      >
        <Eyebrow accent>Error 404</Eyebrow>
        <h1 id="not-found-title" className="display-xl mt-6 max-w-[12ch]">
          This page has <em>wandered off</em>.
        </h1>
        <p className="lead mt-7 max-w-md">It may have moved, or never existed. The collection is still right where we left it.</p>
        <div className="mt-11 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/shop" size="lg">Shop the collection</ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">Back home</ButtonLink>
        </div>
      </section>
    </Container>
  );
}
