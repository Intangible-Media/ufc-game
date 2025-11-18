// app/game/[code]/leaderboard/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LeaderboardPage() {
  const params = useParams();
  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [playerId, setPlayerId] = useState(null);

  // Grab current playerId from cookie, if any
  useEffect(() => {
    const cookieVal = document.cookie
      .split("; ")
      .find((row) => row.startsWith("playerId="));

    if (cookieVal) {
      const id = cookieVal.split("=")[1];
      setPlayerId(id);
    }
  }, []);

  // Load game, players, and picks
  useEffect(() => {
    async function loadLeaderboard() {
      if (!code) return;

      try {
        setLoading(true);

        // 1) Game
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code")
          .eq("code", code)
          .single();

        if (gameError || !gameData) {
          console.error("Leaderboard game load error:", gameError);
          setGame(null);
          setPlayers([]);
          setPicks([]);
          setLoading(false);
          return;
        }

        setGame(gameData);

        // 2) Players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, display_name, created_at")
          .eq("game_id", gameData.id)
          .order("created_at", { ascending: true });

        if (playersError) {
          console.error("Leaderboard players load error:", playersError);
          setPlayers([]);
        } else {
          setPlayers(playersData || []);
        }

        // 3) Picks (for those players)
        const { data: picksData, error: picksError } = await supabase
          .from("picks")
          .select("player_id, points_awarded");

        if (picksError) {
          console.error("Leaderboard picks load error:", picksError);
          setPicks([]);
        } else {
          setPicks(picksData || []);
        }

        setLoading(false);
      } catch (err) {
        console.error("Leaderboard unexpected error:", err);
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [code]);

  // Compute totals per player
  const leaderboard = useMemo(() => {
    if (!players.length) return [];

    const totalsMap = new Map();

    // Initialize totals
    players.forEach((p) => {
      totalsMap.set(p.id, 0);
    });

    // Sum points_awarded for each player's picks
    picks.forEach((pick) => {
      if (!pick.player_id) return;
      const prev = totalsMap.get(pick.player_id) || 0;
      totalsMap.set(pick.player_id, prev + (pick.points_awarded || 0));
    });

    const rows = players.map((p) => ({
      id: p.id,
      name: p.display_name || "Unknown",
      total: totalsMap.get(p.id) || 0,
    }));

    // Sort by total desc, then name
    rows.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [players, picks]);

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
            href="/"
            className="inline-block rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
          >
            Back home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Leaderboard · Game Code: {game.code}
          </p>
          <h1 className="text-3xl font-extrabold">{game.name}</h1>
          <p className="text-sm text-zinc-300">
            Scores update as the host scores each fight.
          </p>
          <div className="flex justify-center gap-3 text-xs text-zinc-400 mt-1">
            <a
              href={`/game/${game.code}/card`}
              className="underline hover:text-yellow-400"
            >
              Back to picks
            </a>
            <a
              href={`/game/${game.code}/host`}
              className="underline hover:text-yellow-400"
            >
              Host panel
            </a>
          </div>
        </header>

        {/* Leaderboard */}
        <section className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400">
              Rank
            </span>
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400">
              Player
            </span>
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-400">
              Points
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              No players yet. Share the code and have people join your game.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {leaderboard.map((row, index) => {
                const isYou = playerId === row.id;
                const isLeader = index === 0;

                return (
                  <li
                    key={row.id}
                    className={`px-4 py-3 flex items-center justify-between text-sm ${
                      isYou ? "bg-zinc-800/60" : ""
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 text-xs font-bold ${
                          isLeader ? "text-yellow-400" : "text-zinc-300"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      {isLeader && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-yellow-500">
                          Top
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 text-center">
                      <span className="font-semibold">
                        {row.name}
                        {isYou && (
                          <span className="ml-2 text-[10px] uppercase text-green-400">
                            (You)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="w-20 text-right">
                      <span className="font-mono text-base">{row.total}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Tiny hint */}
        <p className="text-center text-xs text-zinc-500">
          Tip: open this leaderboard on a TV or iPad while everyone plays.
        </p>
      </div>
    </main>
  );
}
