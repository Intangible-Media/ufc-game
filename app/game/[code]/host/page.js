// app/game/[code]/host/page.js
"use client";

import { useEffect, useState } from "react";
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

  const [results, setResults] = useState({});
  const [savingFightId, setSavingFightId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const pid = searchParams.get("playerId");
    if (!pid) return;
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

  // 🚀 NO ORDER CHECKING
  async function saveResult(fightId) {
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <GameMenu />

      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Host Panel · Game Code: {game.code}
          </p>
          <h1 className="text-2xl font-extrabold">{game.name}</h1>

          <p className="text-sm text-zinc-300">
            Score any fight at any time. No restrictions.
          </p>
        </header>

        <section className="space-y-6">
          {fights.map((fight, index) => {
            const r = results[fight.id] || {
              winner: "",
              method: "",
              round: "",
            };

            const complete = !!(r.winner || r.method || r.round);

            return (
              <div
                key={fight.id}
                className="rounded-2xl border bg-zinc-900/80 border-zinc-800 overflow-hidden"
              >
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

                  {complete && (
                    <span className="text-[10px] uppercase px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 tracking-[0.16em]">
                      Completed
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {/* Winner */}
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase text-zinc-400">
                        Winner
                      </p>
                      <select
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
                        value={r.winner}
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
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
                        value={r.method}
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
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
                        value={r.round}
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

                  <div className="flex justify-end">
                    <button
                      onClick={() => saveResult(fight.id)}
                      disabled={savingFightId === fight.id}
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
        </section>

        {message && (
          <p className="text-center text-sm text-green-400 mt-2">{message}</p>
        )}
      </div>
    </main>
  );
}
