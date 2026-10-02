import { Container } from "@/components/ui/Layout";
import { ProductCardSkeleton } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <Container>
      <div className="pb-14 pt-14 sm:pt-20" aria-busy="true" aria-label="Loading products">
        <Skeleton className="h-12 w-2/3 max-w-lg" />
        <Skeleton className="mt-5 h-5 w-1/2 max-w-sm" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </Container>
  );
}
