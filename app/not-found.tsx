import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fault-grid fault-section flex min-h-screen items-center justify-center px-6 py-10">
      <section className="fault-card arena-stage-shell relative w-full max-w-3xl overflow-hidden rounded-[2rem] p-8 text-center sm:p-12">
        <p className="font-display text-7xl text-fault-flare sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-3xl text-white sm:text-4xl">This room does not exist.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
          The round may have already closed, the link may be wrong, or this lane has not been initialized yet on the current cluster.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/arena" className="arena-primary px-6 py-3 text-xs uppercase tracking-[0.2em]">
            Back to the arena
          </Link>
        </div>
      </section>
    </main>
  );
}
