// app/api/save-picks/route.js
import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { playerId, picks } = body || {};

    if (!playerId || !Array.isArray(picks)) {
      return new Response(
        JSON.stringify({ error: "Missing playerId or picks" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1) Look up player to find their game_id
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, game_id")
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      console.error("save-picks: player not found", playerError);
      return new Response(JSON.stringify({ error: "Player not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) Check game status
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, status")
      .eq("id", player.game_id)
      .single();

    if (gameError || !game) {
      console.error("save-picks: game not found", gameError);
      return new Response(JSON.stringify({ error: "Game not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("save-picks: game status =", game.status);

    // Only lock picks when game is actually live or finished
    if (game.status === "live" || game.status === "finished") {
      return new Response(
        JSON.stringify({
          error: "Picks are locked. The game has already started.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Upsert picks
    const rows = picks.map((p) => ({
      player_id: playerId,
      fight_id: p.fightId,
      pick_winner: p.winner || null,
      pick_method: p.method || null,
      pick_round: p.round ? Number(p.round) : null,
    }));

    const { error: upsertError } = await supabase.from("picks").upsert(rows);

    if (upsertError) {
      console.error("save-picks: upsert error", upsertError);
      return new Response(
        JSON.stringify({
          error: upsertError.message || "Failed to save picks",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("save-picks: unexpected error", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
