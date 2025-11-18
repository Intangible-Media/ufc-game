import { joinGameAction } from "./actions";

export default function JoinGamePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <form
        action={joinGameAction}
        className="w-full max-w-md space-y-6 rounded-2xl bg-zinc-900/80 p-6 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-white text-center">
          Join a Game
        </h1>

        <div className="space-y-2 text-left">
          <label className="block text-sm text-zinc-300" htmlFor="code">
            Game code
          </label>
          <input
            id="code"
            name="code"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="ABC12"
          />
        </div>

        <div className="space-y-2 text-left">
          <label className="block text-sm text-zinc-300" htmlFor="displayName">
            Your name
          </label>
          <input
            id="displayName"
            name="displayName"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="Steven"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
        >
          Join Game
        </button>
      </form>
    </main>
  );
}
