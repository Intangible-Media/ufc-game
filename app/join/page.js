// app/join/page.js
import { joinGameAction } from "./actions";

export default async function JoinGamePage({ searchParams }) {
  const searchParamsReturned = await searchParams;
  // Just log it if you want to debug

  // searchParams is a plain object in the app router
  const initialCode = (searchParamsReturned.code ?? "")
    .toString()
    .toUpperCase();

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Join Game
          </p>
          <h1 className="text-2xl font-extrabold">UFC Fight Picks</h1>
          <p className="text-sm text-zinc-300">
            Enter the game code and your name to join the card.
          </p>
        </header>

        {/* Form */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 px-4 py-6 space-y-4">
          <form action={joinGameAction} className="space-y-5">
            {/* Game code */}
            <div className="space-y-1">
              <label
                htmlFor="code"
                className="block text-[11px] uppercase tracking-[0.25em] text-zinc-400"
              >
                Game Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                defaultValue={initialCode}
                placeholder="X8KF92"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm tracking-[0.2em] uppercase text-center"
              />
              {initialCode && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  Code pre-filled from your invite link.
                </p>
              )}
            </div>

            {/* Player name */}
            <div className="space-y-1">
              <label
                htmlFor="displayName"
                className="block text-[11px] uppercase tracking-[0.25em] text-zinc-400"
              >
                Your Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                placeholder="Bruce Buffer"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
            >
              Join Game
            </button>
          </form>
        </section>

        <p className="text-center text-xs text-zinc-500">
          Already in? Head to your{" "}
          <a
            href="/"
            className="underline text-yellow-400 hover:text-yellow-300"
          >
            home screen
          </a>
          .
        </p>
      </div>
    </main>
  );
}
