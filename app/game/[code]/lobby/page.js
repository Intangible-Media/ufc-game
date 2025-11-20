// app/game/[code]/lobby/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import GameMenu from "@/components/GameMenu";

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [playerId, setPlayerId] = useState(null);
  const [updatingReady, setUpdatingReady] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [message, setMessage] = useState("");

  const [copyMsg, setCopyMsg] = useState("");

  // ---------------------------------------------
  // Read playerId from cookie
  // ---------------------------------------------
  useEffect(() => {
    const cookieVal = document.cookie
      .split("; ")
      .find((row) => row.startsWith("playerId="));

    if (cookieVal) {
      setPlayerId(cookieVal.split("=")[1]);
    }
  }, []);

  // ---------------------------------------------
  // Load game + players
  // ---------------------------------------------
  useEffect(() => {
    async function loadLobby() {
      if (!code) return;

      try {
        setLoading(true);

        // Load game
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code, status, started_at")
          .eq("code", code)
          .single();

        if (gameError || !gameData) {
          setGame(null);
          setPlayers([]);
          setLoading(false);
          return;
        }

        setGame(gameData);

        // Load players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, display_name, is_ready, created_at, game_id")
          .eq("game_id", gameData.id)
          .order("created_at", { ascending: true });

        if (!playersError) setPlayers(playersData || []);

        setLoading(false);
      } catch (err) {
        console.error("Lobby load error:", err);
        setLoading(false);
      }
    }

    loadLobby();
  }, [code]);

  // ---------------------------------------------
  // Helper: refresh both game + players
  // ---------------------------------------------
  async function refreshGameAndPlayers(gameId) {
    try {
      const { data: g } = await supabase
        .from("games")
        .select("id, name, code, status, started_at")
        .eq("id", gameId)
        .single();
      if (g) setGame(g);

      const { data: p } = await supabase
        .from("players")
        .select("id, display_name, is_ready, created_at, game_id")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (p) setPlayers(p);
    } catch (err) {
      console.error("Realtime refresh error:", err);
    }
  }

  // ---------------------------------------------
  // Realtime listener for game + players
  // ---------------------------------------------
  useEffect(() => {
    if (!game?.id) return;

    const gameId = game.id;

    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        () => refreshGameAndPlayers(gameId)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => refreshGameAndPlayers(gameId)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [game?.id]);

  // ---------------------------------------------
  // Auto-redirect when game goes live
  // ---------------------------------------------
  useEffect(() => {
    if (!game || !code) return;
    if (game.status === "live") {
      router.push(`/game/${code}/card`);
    }
  }, [game?.status, code, router]);

  // ---------------------------------------------
  // Memo helpers
  // ---------------------------------------------
  const me = useMemo(
    () => players.find((p) => p.id === playerId) || null,
    [players, playerId]
  );

  const allReady = useMemo(() => {
    if (!players.length) return false;
    return players.every((p) => p.is_ready);
  }, [players]);

  // ---------------------------------------------
  // Toggle ready
  // ---------------------------------------------
  async function toggleReady() {
    if (!me) {
      setMessage("Join the game first.");
      return;
    }

    setUpdatingReady(true);

    try {
      await supabase
        .from("players")
        .update({ is_ready: !me.is_ready })
        .eq("id", me.id);
    } catch (err) {
      setMessage("Could not update ready status.");
    } finally {
      setUpdatingReady(false);
    }
  }

  // ---------------------------------------------
  // Start Game – set synchronized future start time
  // ---------------------------------------------
  async function startGame() {
    if (!game?.id) return;

    setStartingGame(true);
    setMessage("");

    try {
      const LEAD_MS = 7000; // 7-second global synced countdown
      const targetIso = new Date(Date.now() + LEAD_MS).toISOString();

      const { error } = await supabase
        .from("games")
        .update({
          status: "live",
          started_at: targetIso,
        })
        .eq("id", game.id);

      if (error) {
        console.error("Start game error:", error);
        setMessage("Error starting the game.");
        return;
      }

      setMessage("Game starting… countdown sent!");
    } catch (err) {
      console.error("Start game unexpected:", err);
      setMessage("Error starting the game.");
    } finally {
      setStartingGame(false);
    }
  }

  // ---------------------------------------------
  // Copy invite link
  // ---------------------------------------------
  async function copyInviteLink() {
    if (!game?.code) return;

    try {
      const origin = window.location.origin;
      const url = `${origin}/join?code=${game.code}`;

      await navigator.clipboard.writeText(url);
      setCopyMsg("Invite link copied!");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch (err) {
      setCopyMsg("Could not copy.");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  }

  // ---------------------------------------------
  // UI RENDER
  // ---------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading lobby…</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <p>Game not found.</p>
          <a
            href="/"
            className="inline-block bg-yellow-500 px-4 py-2 rounded-lg text-black font-semibold"
          >
            Back Home
          </a>
        </div>
      </main>
    );
  }

  const isLobby = game.status === "lobby";
  const isLive = game.status === "live";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <GameMenu />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Lobby · Game Code: {game.code}
          </p>
          <h1 className="text-3xl font-extrabold">{game.name}</h1>
          <p className="text-sm text-zinc-300">
            Share the link, mark yourself ready, and wait for the host to start
            the synced countdown.
          </p>
        </header>

        {/* Status */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 px-4 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            {/* Status */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                Status
              </p>

              <p className="text-sm">
                {isLobby && (
                  <span className="inline-flex items-center gap-2 text-yellow-400">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    In Lobby (Picks Open)
                  </span>
                )}
                {isLive && (
                  <span className="inline-flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Live (Picks Locked)
                  </span>
                )}
              </p>

              <p className="text-xs text-zinc-400 mt-1 font-mono break-all">
                /join?code={game.code}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              {/* Ready */}
              <button
                onClick={toggleReady}
                disabled={!me || !isLobby || updatingReady}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide
                  ${
                    !me || !isLobby
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : me.is_ready
                      ? "bg-green-500 text-black hover:bg-green-400"
                      : "bg-yellow-500 text-black hover:bg-yellow-400"
                  }`}
              >
                {!me ? "Join First" : me.is_ready ? "Ready ✔" : "I'm Ready"}
              </button>

              {/* Start Game */}
              <button
                onClick={startGame}
                disabled={!isLobby || startingGame || players.length === 0}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide
                  ${
                    !isLobby || players.length === 0
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : allReady
                      ? "bg-green-500 text-black hover:bg-green-400"
                      : "bg-red-500 text-black hover:bg-red-400"
                  }`}
              >
                {startingGame
                  ? "Starting…"
                  : allReady
                  ? "Start (All Ready)"
                  : "Start Anyway"}
              </button>

              {/* Copy invite */}
              <button
                onClick={copyInviteLink}
                className="rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide border border-yellow-500/60 bg-zinc-900/60 hover:bg-zinc-800"
              >
                Copy Invite Link
              </button>
            </div>
          </div>

          {(message || copyMsg) && (
            <p className="text-center text-xs text-zinc-300">
              {message || copyMsg}
            </p>
          )}
        </section>

        {/* Players */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between">
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400">
              Players
            </span>
            <span className="text-xs text-zinc-400">
              {players.length} joined
            </span>
          </div>

          {players.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              Waiting for players to join…
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {players.map((p) => {
                const isMe = p.id === playerId;
                return (
                  <li
                    key={p.id}
                    className="px-4 py-3 flex justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">
                        {p.display_name || "Unknown"}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-green-400">
                          (You)
                        </span>
                      )}
                    </span>

                    <span className="text-xs flex items-center gap-1">
                      {p.is_ready ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-400"></span>
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                          Not ready
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-zinc-500">
          Tip: Put the lobby on a TV or iPad while everyone joins.
        </p>
      </div>
    </main>
  );
}
