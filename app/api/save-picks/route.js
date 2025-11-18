// app/api/save-picks/route.js
import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
  try {
    // Try to parse JSON body
    const body = await request.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
      });
    }

    const { playerId, picks } = body;

    // Basic validation
    if (!playerId) {
      console.error("Save picks error: missing playerId");
      return new Response(
        JSON.stringify({ error: "Missing playerId (try rejoining the game)" }),
        { status: 400 }
      );
    }

    if (!Array.isArray(picks) || picks.length === 0) {
      console.error("Save picks error: empty picks array");
      return new Response(JSON.stringify({ error: "No picks to save" }), {
        status: 400,
      });
    }

    // Map picks into DB rows
    const rows = picks.map((p) => ({
      player_id: playerId,
      fight_id: p.fightId,
      pick_winner: p.winner || null,
      pick_method: p.method || null,
      pick_round: p.round ? Number(p.round) : null,
    }));

    // Upsert so each (player, fight) combo is unique
    const { error } = await supabase.from("picks").upsert(rows, {
      onConflict: "player_id,fight_id",
    });

    if (error) {
      console.error("Save picks supabase error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (err) {
    console.error("Save picks unexpected error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
