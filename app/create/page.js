import { createGameAction } from "./actions";

export default function CreateGamePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <form
        action={createGameAction}
        className="w-full max-w-md space-y-6 rounded-2xl bg-zinc-900/80 p-6 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-white">Create a Game</h1>

        <div className="space-y-2 text-left">
          <label className="block text-sm text-zinc-300" htmlFor="gameName">
            Event name
          </label>
          <input
            id="gameName"
            name="gameName"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="UFC 322 Main Card"
          />
        </div>

        <div className="space-y-2 text-left">
          <label className="block text-sm text-zinc-300" htmlFor="hostName">
            Your name
          </label>
          <input
            id="hostName"
            name="hostName"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="Steven"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
        >
          Create Game
        </button>
      </form>
    </main>
  );
}
