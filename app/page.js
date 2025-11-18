import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            UFC Picks
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">
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
            className="w-full rounded-xl border border-zinc-700 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-zinc-800 transition"
          >
            Join Game
          </Link>
        </div>
      </div>
    </main>
  );
}
