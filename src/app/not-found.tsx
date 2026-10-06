import { ButtonLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Layout";
import { Logo } from "@/components/layout/Logo";

/**
 * Rendered outside the store layout (no header, footer or theme provider), so it carries its own wordmark.
 * Colours still follow the visitor's theme: the <html> element's data-theme is set before paint by the init script.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-canvas text-ink">
      <header className="border-b border-line-soft">
        <Container size="wide" className="flex h-16 items-center">
          <Logo />
        </Container>
      </header>

      <main id="main" className="flex flex-1 items-center">
        <Container size="wide" className="py-24 sm:py-32">
          <section aria-labelledby="not-found-title">
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
      </main>

      <footer className="border-t border-line-soft">
        <Container size="wide" className="flex h-16 items-center">
          <p className="eyebrow">WAHAU — Custom apparel studio</p>
        </Container>
      </footer>
    </div>
  );
}
