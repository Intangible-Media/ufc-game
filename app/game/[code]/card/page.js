// app/game/[code]/card/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import GameMenu from "@/components/GameMenu";
import GameStartCountdown from "@/components/GameStartCountdown";
import UFCHeader from "@/components/UFCHeader";
import FighterFlag from "@/components/FighterFlag";
import Leaderboard from "@/components/Leaderboard";
import FightProgressTracker from "@/components/FightProgressTracker";
import FightsSection from "@/components/FightsCards";

export default function PlayerCardPage() {
  const params = useParams();
  const router = useRouter();

  const searchParams = useSearchParams();

  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [fights, setFights] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [playerId, setPlayerId] = useState(null);
  const [picks, setPicks] = useState({}); // { [fightId]: { winner, method, round } }
  const [totalPoints, setTotalPoints] = useState(0);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Flash reaction state
  const [flash, setFlash] = useState(null);
  // flash = { type: "jackpot" | "partial" | "miss", points: number }

  // Audio refs for scoring reactions
  const jackpotSoundRef = useRef(null);
  const partialSoundRef = useRef(null);
  const missSoundRef = useRef(null);

  // 1) Read playerId from URL first, then cookie
  useEffect(() => {
    const urlPlayerId = searchParams.get("playerId");

    if (urlPlayerId) {
      document.cookie = `playerId=${urlPlayerId}; path=/; max-age=${
        60 * 60 * 24 * 7
      }`;
      setPlayerId(urlPlayerId);
      console.log("playerId from URL:", urlPlayerId);
      return;
    }

    const cookieVal = document.cookie
      .split("; ")
      .find((row) => row.startsWith("playerId="));

    if (cookieVal) {
      const id = cookieVal.split("=")[1];
      console.log("playerId from cookie:", id);
      setPlayerId(id);
    } else {
      console.warn("No playerId found (URL or cookie).");
    }
  }, [searchParams]);

  // Helper: fetch fights for a game (used by initial load + realtime)
  async function fetchFightsForGame(gameId) {
    try {
      const { data: fightsData, error: fightsError } = await supabase
        .from("fights")
        .select(
          "id, game_id, fighter_a, fighter_b, fighter_a_country, fighter_b_country, order_index, result_winner, result_method, result_round"
        )
        .eq("game_id", gameId)
        .order("order_index", { ascending: true });

      if (fightsError) {
        console.error("Fights load error:", fightsError);
        setFights([]);
      } else {
        setFights(fightsData || []);
      }
    } catch (err) {
      console.error("Unexpected fights load error:", err);
    }
  }

  async function fetchLeaderboardPlayers(gameId) {
    const { data, error } = await supabase
      .from("players")
      .select("*") // all player info
      .eq("game_id", gameId)
      .order("total_points", { ascending: false });

    if (error) {
      console.error("Leaderboard load error:", error);
      return;
    }

    setPlayers(data || []);
  }

  useEffect(() => {
    console.log("players", players);
  }, [players]);

  // 2) Load game + fights
  useEffect(() => {
    async function loadGameAndFights() {
      if (!code) return;

      try {
        setLoading(true);

        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code, status, started_at")
          .eq("code", code)
          .single();

        if (gameError || !gameData) {
          console.error("Game load error:", gameError);
          setGame(null);
          setFights([]);
          setLoading(false);
          return;
        }

        setGame(gameData);

        // Load fights for this game
        await fetchFightsForGame(gameData.id);

        setLoading(false);
      } catch (err) {
        console.error("Unexpected load error:", err);
        setLoading(false);
      }
    }

    loadGameAndFights();
  }, [code]);

  // Helper: load picks + total points for this player
  async function fetchPlayerPicks(currentPlayerId) {
    if (!currentPlayerId) return;

    try {
      const { data: picksData, error } = await supabase
        .from("picks")
        .select(
          "fight_id, pick_winner, pick_method, pick_round, points_awarded"
        )
        .eq("player_id", currentPlayerId);

      if (error) {
        console.error("Load picks error:", error);
        return;
      }

      const mapped = {};
      let total = 0;

      (picksData || []).forEach((p) => {
        mapped[p.fight_id] = {
          winner: p.pick_winner || "",
          method: p.pick_method || "",
          round: p.pick_round ? String(p.pick_round) : "",
        };
        total += p.points_awarded || 0;
      });

      setPicks(mapped);
      setTotalPoints(total);
    } catch (err) {
      console.error("Unexpected load picks error:", err);
    }
  }

  // 3) Initial load of picks when playerId + game are known
  useEffect(() => {
    if (!playerId || !game?.id) return;
    fetchPlayerPicks(playerId);
  }, [playerId, game?.id]);

  // 4) Realtime: listen for scoring changes on picks for this player
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase.channel(`picks-player-${playerId}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "picks",
        filter: `player_id=eq.${playerId}`,
      },
      async (payload) => {
        // ❌ Do nothing unless the game is actually live
        if (!game || game.status !== "live") {
          return;
        }

        const oldPoints =
          payload.old && payload.old.points_awarded != null
            ? Number(payload.old.points_awarded)
            : null;
        const newPoints =
          payload.new && payload.new.points_awarded != null
            ? Number(payload.new.points_awarded)
            : null;

        // If nothing really changed, ignore
        if (oldPoints === newPoints) {
          return;
        }

        // Only react the first time this pick is scored
        if (oldPoints !== null) {
          return;
        }

        // Trigger flash reactions only when scoring actually happens
        if (newPoints === 0) {
          triggerFlash("miss", 0);
        } else if (newPoints >= 900) {
          triggerFlash("jackpot", newPoints);
        } else if (newPoints > 0) {
          triggerFlash("partial", newPoints);
        }

        // Refresh picks + total
        await fetchPlayerPicks(playerId);
      }
    );

    channel.subscribe((status) => {
      console.log("Realtime picks subscription status:", status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, game?.status]); // 👈 include game.status

  // 5) Realtime: listen for fight result updates for this game (to update tracker)
  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;

    const channel = supabase.channel(`fights-game-${gameId}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "fights",
        filter: `game_id=eq.${gameId}`,
      },
      async () => {
        console.log("Fights changed, refreshing fight list...");
        await fetchFightsForGame(gameId);
      }
    );

    channel.subscribe((status) => {
      console.log("Realtime fights subscription status:", status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  useEffect(() => {
    if (!game?.id) return;
    fetchLeaderboardPlayers(game.id);
  }, [game?.id]);

  useEffect(() => {
    if (!game?.id) return;

    const channel = supabase.channel(`players-game-${game.id}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "players",
        filter: `game_id=eq.${game.id}`,
      },
      async () => {
        console.log("Leaderboard changed, refreshing players...");
        await fetchLeaderboardPlayers(game.id);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  function playHapticsAndSound(type, points) {
    // Vibration (only on supported devices + secure origin)
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        if (type === "jackpot") {
          // Big hype pattern
          navigator.vibrate([200, 80, 200, 80, 300]);
        } else if (type === "partial") {
          // Small double buzz
          navigator.vibrate([120, 60, 120]);
        } else if (type === "miss") {
          // Single longer buzz of pain
          navigator.vibrate(300);
        }
      } catch (e) {
        console.warn("Vibration failed:", e);
      }
    }

    // Sound
    let audioRef = null;
    if (type === "jackpot") {
      audioRef = jackpotSoundRef.current;
    } else if (type === "partial") {
      audioRef = partialSoundRef.current;
    } else if (type === "miss") {
      audioRef = missSoundRef.current;
    }

    if (audioRef) {
      try {
        audioRef.currentTime = 0;
        audioRef.play().catch((err) => {
          console.warn(
            "Audio play failed (probably user gesture requirement):",
            err
          );
        });
      } catch (e) {
        console.warn("Audio error:", e);
      }
    }
  }

  function triggerFlash(type, points) {
    // run vibration + sound
    playHapticsAndSound(type, points);

    // show full-screen flash
    setFlash({ type, points });

    // Clear after 3 seconds
    setTimeout(() => {
      setFlash(null);
    }, 3000);
  }

  // Update local pick state when user changes dropdowns
  function updatePick(fightId, field, value) {
    setPicks((prev) => ({
      ...prev,
      [fightId]: {
        ...prev[fightId],
        [field]: value,
      },
    }));
  }

  // Save picks to /api/save-picks
  async function savePicks() {
    if (!playerId) {
      setSavedMsg(
        "No player found. Try rejoining the game from the Join screen."
      );
      return;
    }

    const formatted = Object.entries(picks).map(([fightId, p]) => ({
      fightId,
      winner: p.winner || null,
      method: p.method || null,
      round: p.round || null,
    }));

    if (formatted.length === 0) {
      setSavedMsg("You haven't selected anything yet.");
      return;
    }

    setSaving(true);
    setSavedMsg("");

    try {
      const res = await fetch("/api/save-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          picks: formatted,
        }),
      });

      const data = await res.json().catch(() => ({}));

      setSaving(false);

      if (!res.ok) {
        console.error("Save picks failed:", data);
        setSavedMsg(data.error || "Error saving picks.");
        return;
      }

      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);

      // this si where we redirect
      console.log("game", game);
      router.push(`/game/${game.code}/lobby`);
    } catch (err) {
      console.error("Save picks client error:", err);
      setSaving(false);
      setSavedMsg("Error saving picks.");
    }
  }

  // 6) Compute fight tracker statuses
  const fightTracker = useMemo(() => {
    if (!fights.length) return [];

    let currentAssigned = false;

    return fights.map((fight, index) => {
      const isScored =
        fight.result_winner ||
        fight.result_method ||
        (fight.result_round !== null && fight.result_round !== undefined);

      let status = "upcoming"; // "scored" | "current" | "upcoming"

      if (isScored) {
        status = "scored";
      } else if (!currentAssigned) {
        status = "current";
        currentAssigned = true;
      }

      return {
        id: fight.id,
        label: `Fight ${fight.order_index}`,
        status,
      };
    });
  }, [fights]);

  // UI states
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-300">Loading your fight card...</p>
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

  // Picks are locked once game leaves "lobby"
  const picksLocked = game.status && game.status !== "lobby";

  const leaderboardPlayers = [
    { id: "1", name: "Steven Peralta", points: 1700 },
    { id: "2", name: "Steven Peralta Alt", points: 1600 },
    { id: "3", name: "Friend 1", points: 1400 },
    { id: "4", name: "Friend 2", points: 1300 },
  ];

  return (
    <main className="min-h-screen ">
      <GameMenu />

      {/* Full-screen dramatic countdown driven by Supabase realtime */}
      <GameStartCountdown gameId={game.id} initialStartedAt={game.started_at} />

      <UFCHeader
        eventNumber={322}
        rank={2}
        totalPoints={totalPoints}
        gameName={game.name}
      />

      <header className="space-y-4 px-4 py-6 m-0">
        <FightProgressTracker
          fightTracker={fightTracker}
          gameStatus={game.status}
        />
      </header>

      <Leaderboard
        players={players} // array of { id, name, points }
        currentPlayerId={playerId}
      />

      <div className="max-w-4xl mx-auto space-y-8 py-6 bg-white">
        <h2 className="text-center text-2xl uppercase text-black mb-3">
          Main Card
        </h2>
        {/* Header */}

        {/* Fights */}
        <FightsSection
          fights={fights}
          picks={picks}
          picksLocked={picksLocked}
          updatePick={updatePick}
        />

        {/* Save button + message */}
        <div className="space-y-2 px-4">
          <button
            onClick={savePicks}
            disabled={saving || picksLocked}
            className={`w-full rounded-xl py-3 text-sm font-semibold uppercase tracking-wide transition ${
              picksLocked
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-400 text-black"
            }`}
          >
            {picksLocked ? "Picks Locked" : saving ? "Saving..." : "Save Picks"}
          </button>

          {picksLocked && (
            <p className="text-center text-xs text-zinc-400 mt-1">
              The game has started. Picks can no longer be changed.
            </p>
          )}

          {savedMsg && !picksLocked && (
            <p className="text-center text-sm text-green-400">{savedMsg}</p>
          )}
        </div>
      </div>

      {/* Flash overlay */}
      {flash && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
            flash.type === "jackpot"
              ? "bg-gray-900/90"
              : flash.type === "partial"
              ? "bg-yellow-500/90"
              : "bg-red-800/90"
          }`}
        >
          <div className="text-center space-y-4 animate-pulse">
            <p className="text-xs uppercase tracking-[0.3em] text-black/70">
              {flash.type === "miss" ? "Fight Result" : "Bang!"}
            </p>

            {players.map((player, index) => (
              <Image
                key={index}
                src={player.photo_url || "/fighter-1.png"}
                width={100}
                height={100}
                alt="fsfd"
              />
            ))}

            {flash.type === "jackpot" && (
              <>
                <h2 className="text-3xl font-extrabold drop-shadow-lg">
                  YOU JUST GOT {flash.points} POINTS!
                </h2>
                <p className="text-sm font-semibold">
                  Winner + Method + Round... you nailed everything 🔥
                </p>
              </>
            )}

            {flash.type === "partial" && (
              <>
                <h2 className="text-3xl font-extrabold drop-shadow-lg">
                  +{flash.points} POINTS!
                </h2>
                <p className="text-sm font-semibold">
                  Nice pick — you hit part of it. Keep it rolling 👊
                </p>
              </>
            )}

            {flash.type === "miss" && (
              <>
                <h2 className="text-3xl font-extrabold drop-shadow-lg">
                  YOU GOT NOTHING 💀
                </h2>
                <p className="text-sm font-semibold">
                  That one hurt. New fight, new chance.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Audio elements */}
      <audio ref={jackpotSoundRef} src="/sounds/jackpot.mp3" preload="auto" />
      <audio ref={partialSoundRef} src="/sounds/partial.mp3" preload="auto" />
      <audio ref={missSoundRef} src="/sounds/miss.mp3" preload="auto" />
    </main>
  );
}
