import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center filter grayscale"
        style={{ backgroundImage: "url('/main-event-header.jpg')" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            UFC Picks
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">
            Fight Night Score Game
          </h1>
          <p className="mt-3 text-sm text-zinc-300">
            Create a game, share your code, and see who calls the fights the
            best.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/create"
            className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
          >
            Create Game
          </Link>

          <Link
            href="/join"
            className="w-full rounded-xl border border-white py-3 text-sm font-semibold uppercase tracking-wide hover:bg-white transition text-white hover:text-black"
          >
            Join Game
          </Link>
        </div>
      </div>
    </main>
  );
}
