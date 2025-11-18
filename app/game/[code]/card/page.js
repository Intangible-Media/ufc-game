// app/game/[code]/card/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PlayerCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const code = (params?.code || "").toString().toUpperCase();

  const [game, setGame] = useState(null);
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(true);

  const [playerId, setPlayerId] = useState(null);
  const [picks, setPicks] = useState({}); // { [fightId]: { winner, method, round } }

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

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

  // 2) Load game + fights
  useEffect(() => {
    async function loadGameAndFights() {
      if (!code) return;

      try {
        setLoading(true);

        // Load game
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("id, name, code")
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

        // Load fights
        const { data: fightsData, error: fightsError } = await supabase
          .from("fights")
          .select("*")
          .eq("game_id", gameData.id)
          .order("order_index", { ascending: true });

        if (fightsError) {
          console.error("Fights load error:", fightsError);
          setFights([]);
        } else {
          setFights(fightsData || []);
        }

        setLoading(false);
      } catch (err) {
        console.error("Unexpected load error:", err);
        setLoading(false);
      }
    }

    loadGameAndFights();
  }, [code]);

  // 3) Load existing picks for this player once we know playerId + game
  useEffect(() => {
    async function loadExistingPicks() {
      if (!playerId || !game?.id) return;

      try {
        const { data: picksData, error } = await supabase
          .from("picks")
          .select("fight_id, pick_winner, pick_method, pick_round")
          .eq("player_id", playerId);

        if (error) {
          console.error("Load picks error:", error);
          return;
        }

        const mapped = {};
        (picksData || []).forEach((p) => {
          mapped[p.fight_id] = {
            winner: p.pick_winner || "",
            method: p.pick_method || "",
            round: p.pick_round ? String(p.pick_round) : "",
          };
        });

        setPicks(mapped);
      } catch (err) {
        console.error("Unexpected load picks error:", err);
      }
    }

    loadExistingPicks();
  }, [playerId, game?.id]);

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
    } catch (err) {
      console.error("Save picks client error:", err);
      setSaving(false);
      setSavedMsg("Error saving picks.");
    }
  }

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
            Game Code: {game.code}
          </p>
          <h1 className="text-2xl font-extrabold">{game.name}</h1>
          <p className="text-sm text-zinc-300">
            Make your picks for each fight, then hit &quot;Save Picks&quot;.
          </p>
        </header>

        {/* Fights */}
        <section className="space-y-6">
          {fights.map((fight, index) => {
            const fightPick = picks[fight.id] || {
              winner: "",
              method: "",
              round: "",
            };

            return (
              <div
                key={fight.id}
                className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden"
              >
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-yellow-500">
                      Fight {index + 1}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase">
                    Main Card
                  </span>
                </div>

                {/* Body */}
                <div className="px-4 py-4 space-y-4">
                  {/* Fighters */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-left">
                      <p className="text-xs uppercase text-zinc-400">
                        Red Corner
                      </p>
                      <p className="text-lg font-semibold">{fight.fighter_a}</p>
                    </div>
                    <div className="text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
                      VS
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-zinc-400">
                        Blue Corner
                      </p>
                      <p className="text-lg font-semibold">{fight.fighter_b}</p>
                    </div>
                  </div>

                  {/* Winner / Method / Round */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {/* Winner */}
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase text-zinc-400">
                        Winner
                      </p>
                      <select
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm"
                        value={fightPick.winner}
                        onChange={(e) =>
                          updatePick(fight.id, "winner", e.target.value)
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
                        value={fightPick.method}
                        onChange={(e) =>
                          updatePick(fight.id, "method", e.target.value)
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
                        value={fightPick.round}
                        onChange={(e) =>
                          updatePick(fight.id, "round", e.target.value)
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

        {/* Save button + message */}
        <div className="space-y-2">
          <button
            onClick={savePicks}
            disabled={saving}
            className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-yellow-400 transition disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Picks"}
          </button>

          {savedMsg && (
            <p className="text-center text-sm text-green-400">{savedMsg}</p>
          )}
        </div>
      </div>
    </main>
  );
}
