// app/game/[code]/host/page.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import GameMenu from "@/components/GameMenu";

export default function HostPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);

  const [results, setResults] = useState({}); // fightId -> { winner, method, round }
  const [savingFightId, setSavingFightId] = useState(null);
  const [message, setMessage] = useState("");

  // 👇 Host claim: if we arrived with ?playerId=..., set the cookie
  useEffect(() => {
    const pid = searchParams.get("playerId");
    if (!pid) return;

    // Store playerId cookie for 7 days so host is treated like a normal player
    document.cookie = `playerId=${pid}; path=/; max-age=${60 * 60 * 24 * 7}`;
  }, [searchParams]);

  // Load game + fights
  useEffect(() => {
    async function loadGameAndFights() {
      if (!code) return;

      try {
        setLoading(true);

        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code")
          .eq("code", code)
          .single();

        if (gameError || !gameData) {
          console.error("Host game load error:", gameError);
          setGame(null);
          setFights([]);
          setLoading(false);
          return;
        }

        setGame(gameData);

        const { data: fightsData, error: fightsError } = await supabase
          .from("fights")
          .select("*")
          .eq("game_id", gameData.id)
          .order("order_index", { ascending: true });

        if (fightsError) {
          console.error("Host fights load error:", fightsError);
          setFights([]);
          setLoading(false);
          return;
        }

        setFights(fightsData || []);

        // Pre-fill results from DB
        const initialResults = {};
        (fightsData || []).forEach((f) => {
          initialResults[f.id] = {
            winner: f.result_winner || "",
            method: f.result_method || "",
            round: f.result_round ? String(f.result_round) : "",
          };
        });
        setResults(initialResults);

        setLoading(false);
      } catch (err) {
        console.error("Host unexpected load error:", err);
        setLoading(false);
      }
    }

    loadGameAndFights();
  }, [code]);

  function updateResult(fightId, field, value) {
    setResults((prev) => ({
      ...prev,
      [fightId]: {
        ...prev[fightId],
        [field]: value,
      },
    }));
  }

  // Helper: is a fight "complete" for progression purposes?
  function isFightComplete(fightId) {
    const r = results[fightId];
    return !!(r?.winner || r?.method || r?.round);
  }

  // Compute which fight index is currently unlocked:
  // - We start from the LAST fight and move backwards.
  // - The first fight we find that is NOT complete is the "current" one to score.
  // - All fights with an index LOWER than that are LOCKED until we score it.
  const unlockedIndex = useMemo(() => {
    if (!fights.length) return -1;

    for (let i = fights.length - 1; i >= 0; i--) {
      const fight = fights[i];
      if (!isFightComplete(fight.id)) {
        return i;
      }
    }

    // If all fights are complete, we return -1 (meaning no progressive lock).
    return -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fights, results]);

  async function saveResult(fightId) {
    const fightIndex = fights.findIndex((f) => f.id === fightId);

    // Extra safety: prevent scoring out of order via dev tools, etc.
    if (unlockedIndex !== -1 && fightIndex !== unlockedIndex) {
      setMessage(
        "You must score fights in order, starting from the last fight."
      );
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const r = results[fightId] || {};

    if (!r.winner && !r.method && !r.round) {
      setMessage("Set at least a winner, method, or round before scoring.");
      return;
    }

    setSavingFightId(fightId);
    setMessage("");

    try {
      const res = await fetch("/api/set-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fightId,
          resultWinner: r.winner || null,
          resultMethod: r.method || null,
          resultRound: r.round || null,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      console.log("set-result response status:", res.status);
      console.log("set-result raw response:", text);

      setSavingFightId(null);

      if (!res.ok) {
        console.error("Set result error:", data);
        setMessage(
          data.error ||
            `Error saving result and scoring picks (status ${res.status}).`
        );
        return;
      }

      setMessage(`Scored fight. Picks updated: ${data.picksScored ?? 0}.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Set result fetch error:", err);
      setSavingFightId(null);
      setMessage("Error saving result and scoring picks.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-300">Loading host panel...</p>
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

  const totalFights = fights.length;
  const currentStep =
    unlockedIndex === -1 ? totalFights : totalFights - unlockedIndex; // last fight is step 1, then 2, etc.

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <GameMenu />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Host Panel · Game Code: {game.code}
          </p>
          <h1 className="text-2xl font-extrabold">{game.name}</h1>

          <p className="text-sm text-zinc-300">
            Score fights in order starting from the{" "}
            <span className="font-semibold text-yellow-400">last fight</span>.
            Once you lock in the result for a fight, the{" "}
            <span className="font-semibold">previous fight</span> will unlock.
          </p>

          {totalFights > 0 && unlockedIndex !== -1 && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">
                Progress:{" "}
                <span className="font-semibold text-yellow-400">
                  Step {currentStep} of {totalFights}
                </span>
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/40 uppercase tracking-[0.18em]">
                Score last fight first
              </span>
            </div>
          )}

          {totalFights > 0 && unlockedIndex === -1 && (
            <p className="text-xs text-emerald-400">
              All fights have been scored. You can review results at any time.
            </p>
          )}
        </header>

        {/* Fights list */}
        <section className="space-y-6">
          {fights.map((fight, index) => {
            const r = results[fight.id] || {
              winner: "",
              method: "",
              round: "",
            };

            const complete = isFightComplete(fight.id);
            const locked = unlockedIndex !== -1 && index < unlockedIndex; // earlier than the current unlocked fight
            const isCurrent = unlockedIndex === index;

            const cardBase =
              "rounded-2xl border overflow-hidden transition duration-200";
            const cardState = locked
              ? "bg-zinc-900/40 border-zinc-800 opacity-50"
              : isCurrent
              ? "bg-gradient-to-b from-yellow-500/10 to-zinc-900 border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.35)]"
              : "bg-zinc-900/80 border-zinc-800";

            return (
              <div key={fight.id} className={`${cardBase} ${cardState}`}>
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-yellow-500">
                      Fight {index + 1}
                    </span>
                    <span className="text-xs text-zinc-300 font-medium">
                      {fight.fighter_a}{" "}
                      <span className="text-zinc-500 text-[11px]">vs</span>{" "}
                      {fight.fighter_b}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {complete && (
                      <span className="text-[10px] uppercase px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 tracking-[0.16em]">
                        Completed
                      </span>
                    )}
                    {locked && (
                      <span className="text-[10px] uppercase px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 tracking-[0.16em]">
                        Locked
                      </span>
                    )}
                    {isCurrent && !complete && (
                      <span className="text-[10px] uppercase px-2 py-1 rounded-full bg-yellow-500 text-black font-semibold tracking-[0.16em]">
                        Next to Score
                      </span>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="px-4 py-4 space-y-4 relative">
                  {locked && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.16em]">
                      <div className="px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-300">
                        Score the later fights first to unlock this one
                      </div>
                    </div>
                  )}

                  {/* Result dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {/* Winner */}
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase text-zinc-400">
                        Winner
                      </p>
                      <select
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        value={r.winner}
                        disabled={locked}
                        onChange={(e) =>
                          updateResult(fight.id, "winner", e.target.value)
                        }
                      >
                        <option value="">Select winner</option>
                        <option value="A">{fight.fighter_a}</option>
                        <option value="B">{fight.fighter_b}</option>
                      </select>
                    </div>

                    {/* Method */}
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase text-zinc-400">
                        Method
                      </p>
                      <select
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        value={r.method}
                        disabled={locked}
                        onChange={(e) =>
                          updateResult(fight.id, "method", e.target.value)
                        }
                      >
                        <option value="">Select method</option>
                        <option value="KO">KO / TKO</option>
                        <option value="SUB">Submission</option>
                        <option value="DEC">Decision</option>
                      </select>
                    </div>

                    {/* Round */}
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase text-zinc-400">
                        Round
                      </p>
                      <select
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        value={r.round}
                        disabled={locked}
                        onChange={(e) =>
                          updateResult(fight.id, "round", e.target.value)
                        }
                      >
                        <option value="">Select round</option>
                        <option value="1">Round 1</option>
                        <option value="2">Round 2</option>
                        <option value="3">Round 3</option>
                        <option value="4">Round 4</option>
                        <option value="5">Round 5</option>
                      </select>
                    </div>
                  </div>

                  {/* Save / score button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveResult(fight.id)}
                      disabled={
                        locked ||
                        savingFightId === fight.id ||
                        unlockedIndex === -1
                          ? locked || savingFightId === fight.id
                          : savingFightId === fight.id
                      }
                      className="rounded-xl bg-yellow-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingFightId === fight.id
                        ? "Scoring..."
                        : complete
                        ? "Update Result"
                        : "Score Fight"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {fights.length === 0 && (
            <p className="text-sm text-zinc-400">
              No fights configured for this game yet.
            </p>
          )}
        </section>

        {/* Status message */}
        {message && (
          <p className="text-center text-sm text-green-400 mt-2">{message}</p>
        )}
      </div>
    </main>
  );
}
