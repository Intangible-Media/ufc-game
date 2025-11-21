// app/game/[code]/leaderboard/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import GameMenu from "@/components/GameMenu";
import Leaderboard from "@/components/Leaderboard";
import Image from "next/image";
import UFCHeader from "@/components/UFCHeader";

export default function LeaderboardPage() {
  const params = useParams();
  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper: fetch leaderboard for game (just like card page uses players)
  async function fetchLeaderboardForGame(gameId) {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*") // match card page
        .eq("game_id", gameId)
        .order("total_points", { ascending: false });

      if (error) {
        console.error("Leaderboard: players load error", error);
        setLeaderboard([]);
        return;
      }

      console.log("data", data);

      const lb = (data || []).map((p) => ({
        id: p.id,
        name: p.name || p.display_name || "Player",
        photo_url: p.photo_url || "/fighter-1.png",
        total_points: p.total_points || 0,
      }));

      console.log("lb", lb);

      setLeaderboard(lb);
    } catch (err) {
      console.error("Leaderboard: unexpected fetch error", err);
      setLeaderboard([]);
    }
  }

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

  // 2) Realtime: when any player's total_points changes, refresh leaderboard
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
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log("Leaderboard: players changed", payload);
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

  // Derived stats for extra sections
  const totalPlayers = leaderboard.length;
  const topPlayer = leaderboard[0] || null;
  const secondPlayer = leaderboard[1] || null;
  const thirdPlayer = leaderboard[2] || null;
  const topThree = leaderboard.slice(0, 3);

  const totalPointsSum = leaderboard.reduce(
    (sum, p) => sum + (p.total_points || 0),
    0
  );
  const averagePoints =
    totalPlayers > 0 ? Math.round(totalPointsSum / totalPlayers) : 0;

  // UI states
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-100 text-neutral-900">
        <p className="text-sm text-neutral-500">Loading leaderboard...</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-100 text-neutral-900 px-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Game not found.</p>
          <a
            href="/join"
            className="inline-block rounded bg-yellow-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition"
          >
            Go back to Join
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <GameMenu />

      <UFCHeader
        eventNumber={322}
        rank={2}
        totalPoints={1200}
        gameName={game.name}
      />

      <div className="max-w-4xl mx-auto pb-8 space-y-3 ">
        {/* Header */}
        <div className="py-6 mb-0  overflow-hidden aspect-[2/1">
          <header className="space-y-2 px-4">
            <p className="text-xs uppercase tracking-[0.25em] text-green-700">
              Live Leaderboard · Game Code: {game.code}
            </p>
            <h1 className="text-2xl md:text-3xl text-black ">{game.name}</h1>
          </header>

          {/* Quick stats row */}
          <section className="grid grid-cols-3 gap-3 px-4 mb-0 mt-3">
            <div className="rounded bg-white border border-neutral-200 px-4 py-3  ">
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
                Players
              </p>
              <p className="text-2xl  text-neutral-900">{totalPlayers}</p>
            </div>
            <div className="rounded bg-white border border-neutral-200 px-4 py-3  ">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#c79d14] mb-1">
                Top Score
              </p>
              <p className="text-2xl  text-[#c79d14]">
                {topPlayer ? topPlayer.total_points : 0}
              </p>
            </div>
            <div className="rounded bg-white border border-neutral-200 px-4 py-3  ">
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
                Avg Points
              </p>
              <p className="text-2xl  text-neutral-900">{averagePoints}</p>
            </div>
          </section>
        </div>

        {/* Podium section */}
        <section className="bg-white border border-neutral-200 px-4 py-6  m-0">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-700">
              Podium
            </h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-yellow-600">
              Top 3 Fighters
            </span>
          </div>

          {topThree.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">
              No players yet. Share your game code so friends can join.
            </p>
          ) : (
            <div className="flex items-end justify-center gap-4 md:gap-8 mt-4">
              {/* 2nd place - left */}
              {secondPlayer && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center border border-neutral-300 text-lg   text-neutral-700 overflow-hidden">
                    <Image
                      src={secondPlayer.photo_url}
                      width={80}
                      height={80}
                      alt={secondPlayer.name}
                      className="w-full h-full object-cover relative z-10"
                    />
                  </div>
                  <div className="bg-neutral-100  rounded-t-lg  rounded-b-lg px-3 py-2 w-20 text-center border border-neutral-300 h-20 flex flex-col justify-end">
                    <p className="text-[11px] text-neutral-500 uppercase">
                      2nd
                    </p>
                    <p className="text-xs uppercase font-semibold truncate text-neutral-800">
                      {secondPlayer.name}
                    </p>
                    <p className="text-xs   text-neutral-700">
                      {secondPlayer.total_points} pts
                    </p>
                  </div>
                </div>
              )}

              {/* 1st place - center, tallest */}
              {topPlayer && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-400 bg-neutral-900 flex items-center justify-center relative">
                    {/* Initial behind image as fallback */}

                    <Image
                      src={topPlayer.photo_url}
                      width={80}
                      height={80}
                      alt={topPlayer.name}
                      className="w-full h-full object-cover relative z-10"
                    />
                  </div>
                  <div className="bg-[linear-gradient(90deg,#C79D14_0%,#D6B373_100%)]  rounded-t-lg  rounded-b-lg px-4 py-3 w-28 text-center h-28 flex flex-col justify-end">
                    <p className="text-[11px] text-white uppercase tracking-[0.18em]">
                      1st
                    </p>
                    <p className="text-xs uppercase font-semibold text-white truncate">
                      {topPlayer.name}
                    </p>
                    <p className="text-sm  text-white">
                      {topPlayer.total_points} pts
                    </p>
                  </div>
                </div>
              )}

              {/* 3rd place - right */}
              {thirdPlayer && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-[linear-gradient(90deg,#C79D14_0%,#D6B373_100%)] flex items-center justify-center border text-lg   text-amber-600 overflow-hidden">
                    <span className="relative z-10">
                      {thirdPlayer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-amber-50  rounded-t-lg  rounded-b-lg px-3 py-2 w-20 text-center border border-amber-200 h-16 flex flex-col justify-end">
                    <p className="text-[11px] text-amber-700 uppercase">3rd</p>
                    <p className="text-xs font-semibold truncate text-amber-900">
                      {thirdPlayer.name}
                    </p>
                    <p className="text-xs uppercase   text-amber-800">
                      {thirdPlayer.total_points} pts
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Full Leaderboard table */}
        <section className="rounded bg-white border border-neutral-200 overflow-hidden  hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex justify-between text-xs uppercase tracking-[0.2em] text-neutral-500">
            <span>Rank</span>
            <span>Player</span>
            <span>Points</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-500">
              No players yet. Share your game code so friends can join.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {leaderboard.map((p, index) => {
                const rank = index + 1;
                let rankBadge = null;

                if (rank === 1) {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-black text-xs  ">
                      1
                    </span>
                  );
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-300 text-black text-xs  ">
                      2
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-black text-xs  ">
                      3
                    </span>
                  );
                } else {
                  rankBadge = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 text-xs  ">
                      {rank}
                    </span>
                  );
                }

                return (
                  <li
                    key={p.id}
                    className={`px-4 py-3 flex items-center justify-between text-sm ${
                      rank === 1 ? "bg-yellow-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">{rankBadge}</div>
                    <div className="flex-1 text-center">
                      <span className="font-semibold text-neutral-900">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="  text-yellow-600">
                        {p.total_points}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Leaderboard players={leaderboard} currentPlayerId={leaderboard[0]} />
      </div>
    </main>
  );
}
