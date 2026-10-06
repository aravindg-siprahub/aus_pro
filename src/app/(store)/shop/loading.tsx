import { Container } from "@/components/ui/Layout";
import { ProductCardSkeleton } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <Container size="wide">
      <div aria-busy="true" aria-label="Loading products">
        {/* Page header */}
        <div className="pb-12 pt-12 sm:pb-16 sm:pt-20 lg:pt-28">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="mt-6 h-12 w-3/4 max-w-md sm:h-16" />
          <Skeleton className="mt-6 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2.5 h-4 w-2/3 max-w-sm" />
        </div>
        {/* Filter bar */}
        <div className="-mx-5 flex items-center gap-6 border-b border-line-soft px-5 py-[1.15rem] sm:-mx-8 sm:gap-8 sm:px-8 lg:-mx-12 lg:px-12">
          {["w-8", "w-20", "w-10", "w-14"].map((w) => <Skeleton key={w} className={`h-3 ${w}`} />)}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-14 pb-16 pt-16 sm:gap-x-6 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-24 lg:pt-12">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    </Container>
  );
}
