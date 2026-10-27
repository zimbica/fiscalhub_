import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando seu espaço" className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-36 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-md" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
