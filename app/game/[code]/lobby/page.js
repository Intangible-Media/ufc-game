// app/game/[code]/lobby/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LobbyPage() {
  const params = useParams();
  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [playerId, setPlayerId] = useState(null);
  const [updatingReady, setUpdatingReady] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [message, setMessage] = useState("");

  // Get playerId from cookie
  useEffect(() => {
    const cookieVal = document.cookie
      .split("; ")
      .find((row) => row.startsWith("playerId="));

    if (cookieVal) {
      const id = cookieVal.split("=")[1];
      setPlayerId(id);
    }
  }, []);

  // Load game + players
  useEffect(() => {
    async function loadLobby() {
      if (!code) return;

      try {
        setLoading(true);

        // 1) Load game
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code, status, started_at")
          .eq("code", code)
          .single();

        if (gameError || !gameData) {
          console.error("Lobby game load error:", gameError);
          setGame(null);
          setPlayers([]);
          setLoading(false);
          return;
        }

        setGame(gameData);

        // 2) Load players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, display_name, is_ready, created_at, game_id")
          .eq("game_id", gameData.id)
          .order("created_at", { ascending: true });

        if (playersError) {
          console.error("Lobby players load error:", playersError);
          setPlayers([]);
        } else {
          setPlayers(playersData || []);
        }

        setLoading(false);
      } catch (err) {
        console.error("Lobby unexpected error:", err);
        setLoading(false);
      }
    }

    loadLobby();
  }, [code]);

  // Helper: refresh players and game (for realtime)
  async function refreshGameAndPlayers(currentGameId) {
    if (!currentGameId) return;

    try {
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("id, name, code, status, started_at")
        .eq("id", currentGameId)
        .single();

      if (!gameError && gameData) {
        setGame(gameData);
      }

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, display_name, is_ready, created_at, game_id")
        .eq("game_id", currentGameId)
        .order("created_at", { ascending: true });

      if (!playersError && playersData) {
        setPlayers(playersData);
      }
    } catch (err) {
      console.error("Lobby realtime refresh error:", err);
    }
  }

  // Realtime: subscribe to game + players changes
  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;

    const channel = supabase
      .channel(`lobby-game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        () => {
          console.log("Lobby: game changed");
          refreshGameAndPlayers(gameId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          console.log("Lobby: players changed");
          refreshGameAndPlayers(gameId);
        }
      );

    channel.subscribe((status) => {
      console.log("Lobby realtime subscription status:", status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  const me = useMemo(
    () => players.find((p) => p.id === playerId) || null,
    [players, playerId]
  );

  const allReady = useMemo(() => {
    if (!players.length) return false;
    return players.every((p) => p.is_ready);
  }, [players]);

  async function toggleReady() {
    if (!me) {
      setMessage("Join the game first, then come back to the lobby.");
      return;
    }

    setUpdatingReady(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("players")
        .update({ is_ready: !me.is_ready })
        .eq("id", me.id);

      if (error) {
        console.error("Lobby toggle ready error:", error);
        setMessage("Error updating ready status.");
      }
    } catch (err) {
      console.error("Lobby toggle ready unexpected error:", err);
      setMessage("Error updating ready status.");
    } finally {
      setUpdatingReady(false);
    }
  }

  async function startGame() {
    if (!game?.id) return;

    setStartingGame(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("games")
        .update({
          status: "live",
          started_at: new Date().toISOString(),
        })
        .eq("id", game.id);

      if (error) {
        console.error("Start game error:", error);
        setMessage("Error starting the game.");
      } else {
        setMessage("Game started! Picks are now locked.");
      }
    } catch (err) {
      console.error("Start game unexpected error:", err);
      setMessage("Error starting the game.");
    } finally {
      setStartingGame(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-300">Loading lobby...</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Game not found.</p>
          <a
            href="/"
            className="inline-block rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
          >
            Back home
          </a>
        </div>
      </main>
    );
  }

  const isLive = game.status === "live";
  const isLobby = game.status === "lobby";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Lobby · Game Code: {game.code}
          </p>
          <h1 className="text-3xl font-extrabold">{game.name}</h1>
          <p className="text-sm text-zinc-300">
            Share the code, let everyone join, mark yourself ready, then start
            the game to lock picks.
          </p>

          <div className="flex justify-center gap-3 text-xs text-zinc-400 mt-2">
            <a
              href={`/game/${game.code}/card`}
              className="underline hover:text-yellow-400"
            >
              Go to your picks
            </a>
            <a
              href={`/game/${game.code}/leaderboard`}
              className="underline hover:text-yellow-400"
            >
              View leaderboard
            </a>
            <a
              href={`/game/${game.code}/host`}
              className="underline hover:text-yellow-400"
            >
              Host panel
            </a>
          </div>
        </header>

        {/* Status + controls */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 px-4 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                Game Status
              </p>
              <p className="text-sm mt-1">
                {isLobby && (
                  <span className="inline-flex items-center gap-2 text-yellow-400">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    In Lobby – picks open
                  </span>
                )}
                {isLive && (
                  <span className="inline-flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Live – picks locked
                  </span>
                )}
                {!isLobby && !isLive && (
                  <span className="text-zinc-300">{game.status}</span>
                )}
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2">
              <button
                onClick={toggleReady}
                disabled={!me || !isLobby || updatingReady}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  !me || !isLobby
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : me?.is_ready
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-yellow-500 hover:bg-yellow-400 text-black"
                }`}
              >
                {!me
                  ? "Join the game first"
                  : !isLobby
                  ? "Game already started"
                  : me.is_ready
                  ? "Ready ✔"
                  : "I'm Ready"}
              </button>

              <button
                onClick={startGame}
                disabled={!isLobby || startingGame || players.length === 0}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  !isLobby || players.length === 0
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : allReady
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-red-500 hover:bg-red-400 text-black"
                }`}
              >
                {isLobby
                  ? startingGame
                    ? "Starting..."
                    : allReady
                    ? "Start Game (All Ready)"
                    : "Start Game Anyway"
                  : "Game Started"}
              </button>
            </div>
          </div>

          {message && (
            <p className="text-xs text-center text-zinc-300">{message}</p>
          )}
        </section>

        {/* Players list */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400">
              Players
            </span>
            <span className="text-xs text-zinc-400">
              {players.length} joined
            </span>
          </div>

          {players.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              No one has joined yet. Share the code and have people join your
              game from the Join screen.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {players.map((p) => {
                const isMe = p.id === playerId;
                return (
                  <li
                    key={p.id}
                    className="px-4 py-3 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {p.display_name || "Unknown"}
                      </span>
                      {isMe && (
                        <span className="text-[10px] uppercase text-green-400">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {p.is_ready ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <span className="w-2 h-2 rounded-full bg-zinc-600" />
                          Not ready
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-zinc-500">
          Tip: keep the lobby on a TV or iPad while everyone joins and gets
          ready.
        </p>
      </div>
    </main>
  );
}
