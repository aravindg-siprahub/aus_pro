import { Container } from "@/components/ui/Layout";
import { Skeleton } from "@/components/ui/Feedback";

/** Mirrors the product page: thumbnail rail + stage on the left, the info column on the right. */
export default function Loading() {
  return (
    <Container size="wide">
      <div className="py-4 sm:py-8"><Skeleton className="h-3.5 w-48 max-w-full" /></div>
      <div
        className="grid gap-7 pb-24 sm:gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16 lg:pb-32 xl:gap-24"
        aria-busy="true"
        aria-label="Loading product"
      >
        <div className="flex min-w-0 flex-col lg:flex-row lg:gap-5">
          <div className="order-2 mt-4 hidden gap-2 p-1 sm:flex lg:order-1 lg:mt-0 lg:w-[88px] lg:shrink-0 lg:flex-col">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-[72px] shrink-0 lg:w-full" />
            ))}
          </div>
          <Skeleton className="order-1 aspect-[4/5] max-h-[54svh] w-full sm:max-h-[74svh] lg:order-2 lg:aspect-auto lg:h-[calc(100svh-var(--sticky-top)-3rem)] lg:max-h-[920px] lg:min-h-[560px] lg:flex-1" />
          <Skeleton className="order-3 mt-3 h-px w-full sm:hidden" />
        </div>

        <div className="min-w-0 lg:max-w-[540px] lg:pt-6">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-5 h-11 w-4/5" />
          <div className="mt-5 flex justify-between gap-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mt-7 h-4 w-full" />
          <Skeleton className="mt-2.5 h-4 w-5/6" />
          <Skeleton className="mt-2.5 h-4 w-2/3" />

          <div className="mt-10 border-t border-line-soft pt-8">
            <Skeleton className="h-3.5 w-28" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 w-9 !rounded-full" />
              <Skeleton className="h-9 w-9 !rounded-full" />
            </div>
          </div>
          <Skeleton className="mt-8 h-3.5 w-16" />
          <div className="mt-4 grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12" />)}
          </div>

          <div className="mt-10 border-t border-line-soft pt-8">
            <Skeleton className="h-3.5 w-32" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>

          <div className="mt-10 border-t border-line-soft pt-8">
            <Skeleton className="h-[52px] w-full" />
            <Skeleton className="mt-11 h-[52px] w-full" />
          </div>
        </div>
      </div>
    </Container>
  );
}
