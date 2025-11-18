// app/api/set-result/route.js
import { supabase } from "@/lib/supabaseClient";

function scorePick(pick, resultWinner, resultMethod, resultRound) {
  let score = 0;

  // Winner correct → +100
  if (resultWinner && pick.pick_winner === resultWinner) {
    score += 100;
  }

  // Method correct → +300
  if (resultMethod && pick.pick_method === resultMethod) {
    score += 300;
  }

  // Round correct → +500
  const pickRound = pick.pick_round ? Number(pick.pick_round) : null;
  const resRound = resultRound ? Number(resultRound) : null;

  if (resRound && pickRound && pickRound === resRound) {
    score += 500;
  }

  return score;
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("set-result: invalid JSON", e);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { fightId, resultWinner, resultMethod, resultRound } = body || {};

    if (!fightId) {
      console.error("set-result: missing fightId", body);
      return new Response(JSON.stringify({ error: "Missing fightId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1) Update fight result
    const { error: fightError } = await supabase
      .from("fights")
      .update({
        result_winner: resultWinner || null,
        result_method: resultMethod || null,
        result_round: resultRound ? Number(resultRound) : null,
      })
      .eq("id", fightId);

    if (fightError) {
      console.error("set-result: fight update error", fightError);
      return new Response(
        JSON.stringify({
          error: fightError.message || "Failed to update fight",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Fetch picks for this fight
    const { data: picks, error: picksError } = await supabase
      .from("picks")
      .select("id, pick_winner, pick_method, pick_round, player_id")
      .eq("fight_id", fightId);

    if (picksError) {
      console.error("set-result: fetch picks error", picksError);
      return new Response(
        JSON.stringify({ error: picksError.message || "Failed to load picks" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!picks || picks.length === 0) {
      console.log("set-result: no picks to score for fight", fightId);
      return new Response(JSON.stringify({ success: true, picksScored: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3) Score each pick
    const scoredRows = picks.map((p) => ({
      id: p.id,
      points_awarded: scorePick(p, resultWinner, resultMethod, resultRound),
    }));

    // 4) Update picks table
    const { error: scoreError } = await supabase
      .from("picks")
      .upsert(scoredRows, { onConflict: "id" });

    if (scoreError) {
      console.error("set-result: score update error", scoreError);
      return new Response(
        JSON.stringify({
          error: scoreError.message || "Failed to update scores",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, picksScored: scoredRows.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("set-result: unexpected error", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
