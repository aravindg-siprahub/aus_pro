import { Container } from "@/components/ui/Layout";
import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <Container size="wide">
      <div className="pb-14 pt-14 sm:pt-20" aria-busy="true" aria-label="Loading collections">
        <Skeleton className="h-12 w-2/3 max-w-lg" />
        <Skeleton className="mt-5 h-5 w-1/2 max-w-sm" />
      </div>
      <div className="space-y-3 pb-20 sm:space-y-5">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-tile sm:h-96 md:h-[480px]" />)}
      </div>
    </Container>
  );
}
