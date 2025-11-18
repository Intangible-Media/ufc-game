"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import GameMenu from "@/components/GameMenu";

export default function LeaderboardPage() {
  const params = useParams();
  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1) Load game + initial leaderboard
  useEffect(() => {
    async function loadGameAndLeaderboard() {
      if (!code) return;
      setLoading(true);

      try {
        // Find game by code
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code, status")
          .eq("code", code)
          .single();

        if (gameError || !gameData) {
          console.error("Leaderboard: game load error", gameError);
          setGame(null);
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        setGame(gameData);

        // Load leaderboard for this game
        await fetchLeaderboardForGame(gameData.id);
      } catch (err) {
        console.error("Leaderboard: unexpected load error", err);
      } finally {
        setLoading(false);
      }
    }

    loadGameAndLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Helper: fetch leaderboard for game
  async function fetchLeaderboardForGame(gameId) {
    try {
      // 1) Get players in this game
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name")
        .eq("game_id", gameId);

      if (playersError) {
        console.error("Leaderboard: players load error", playersError);
        setLeaderboard([]);
        return;
      }

      if (!players || players.length === 0) {
        setLeaderboard([]);
        return;
      }

      const playerIds = players.map((p) => p.id);

      // 2) Get picks for those players (we only care about points_awarded)
      const { data: picks, error: picksError } = await supabase
        .from("picks")
        .select("player_id, points_awarded")
        .in("player_id", playerIds);

      if (picksError) {
        console.error("Leaderboard: picks load error", picksError);
        setLeaderboard([]);
        return;
      }

      // 3) Sum points per player
      const totalsMap = new Map();
      playerIds.forEach((id) => totalsMap.set(id, 0));

      (picks || []).forEach((p) => {
        const current = totalsMap.get(p.player_id) || 0;
        totalsMap.set(p.player_id, current + (p.points_awarded || 0));
      });

      // 4) Build leaderboard array
      const lb = players.map((p) => ({
        id: p.id,
        name: p.name || "Player",
        points: totalsMap.get(p.id) || 0,
      }));

      // 5) Sort by points desc
      lb.sort((a, b) => b.points - a.points);

      setLeaderboard(lb);
    } catch (err) {
      console.error("Leaderboard: unexpected fetch error", err);
    }
  }

  // 2) Realtime: when any pick is updated, refresh leaderboard
  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;

    const channel = supabase
      .channel(`leaderboard-game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "picks",
          // no filter: low volume, so we just refetch for this game
        },
        async (payload) => {
          console.log("Leaderboard: picks changed", payload);
          await fetchLeaderboardForGame(gameId);
        }
      )
      .subscribe((status) => {
        console.log("Leaderboard realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  // UI states
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-300">Loading leaderboard...</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Game not found.</p>
          <a
            href="/join"
            className="inline-block rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
          >
            Go back to Join
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <GameMenu />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Live Leaderboard · Game Code: {game.code}
          </p>
          <h1 className="text-2xl font-extrabold">{game.name}</h1>
          <p className="text-sm text-zinc-300">
            Scores update automatically as fights are scored.
          </p>
        </header>

        {/* Leaderboard table */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between text-xs uppercase tracking-[0.2em] text-zinc-400">
            <span>Rank</span>
            <span>Player</span>
            <span>Points</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              No players yet. Share your game code so friends can join.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {leaderboard.map((p, index) => {
                const rank = index + 1;
                let rankBadge = null;

                if (rank === 1) {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold">
                      1
                    </span>
                  );
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-300 text-black text-xs font-bold">
                      2
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-black text-xs font-bold">
                      3
                    </span>
                  );
                } else {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold">
                      {rank}
                    </span>
                  );
                }

                return (
                  <li
                    key={p.id}
                    className={`px-4 py-3 flex items-center justify-between text-sm ${
                      rank === 1 ? "bg-yellow-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">{rankBadge}</div>
                    <div className="flex-1 text-center">
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-yellow-400">
                        {p.points}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
