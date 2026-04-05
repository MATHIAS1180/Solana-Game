import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ title = "Loading arena surface" }: { title?: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-12">
      <div className="fault-card rounded-[1.9rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <Skeleton variant="text" className="w-40" />
          <Skeleton variant="title" className="w-80 max-w-full" />
          <Skeleton variant="text" className="w-full max-w-3xl" />
        </div>
      </div>

      <section className="fault-card rounded-[2rem] p-6 sm:p-8">
        <p className="arena-kicker">{title}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Skeleton variant="card" className="rounded-[1.5rem]" />
          <Skeleton variant="card" className="rounded-[1.5rem]" />
          <Skeleton variant="card" className="rounded-[1.5rem]" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Skeleton variant="card" className="rounded-[1.75rem]" />
        <Skeleton variant="card" className="rounded-[1.75rem]" />
      </section>
    </main>
  );
}
