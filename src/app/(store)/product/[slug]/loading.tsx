import { Container } from "@/components/ui/Layout";
import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <Container size="wide">
      <div className="py-5"><Skeleton className="h-4 w-32" /></div>
      <div className="grid gap-8 pb-20 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20" aria-busy="true" aria-label="Loading product">
        <Skeleton className="aspect-[4/5] rounded-tile sm:aspect-square lg:aspect-auto lg:h-[calc(100svh-7rem)] lg:max-h-[860px] lg:min-h-[520px]" />
        <div className="lg:pt-10">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-12 w-3/4" />
          <Skeleton className="mt-5 h-6 w-1/3" />
          <Skeleton className="mt-8 h-24 w-full" />
          <Skeleton className="mt-10 h-14 w-full rounded-full" />
          <Skeleton className="mt-3 h-14 w-full rounded-full" />
        </div>
      </div>
    </Container>
  );
}
