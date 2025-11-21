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

    // 0) Get fight so we know game_id
    const { data: fightRow, error: fightFetchError } = await supabase
      .from("fights")
      .select("id, game_id")
      .eq("id", fightId)
      .single();

    if (fightFetchError || !fightRow) {
      console.error(
        "set-result: could not load fight/game_id",
        fightFetchError
      );
      return new Response(
        JSON.stringify({
          error: "Failed to load fight / game context",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const gameId = fightRow.game_id;

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

    // 2) Fetch picks for THIS fight
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

    // 3) Score picks for this fight
    const scoredRows = picks.map((p) => ({
      id: p.id,
      points_awarded: scorePick(p, resultWinner, resultMethod, resultRound),
    }));

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

    // 4) Recalculate total_points per player in this game
    // 4a) Get all players for this game
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", gameId);

    if (playersError) {
      console.error("set-result: error loading players", playersError);
      return new Response(
        JSON.stringify({
          success: true,
          picksScored: scoredRows.length,
          warning: "Fight scored but failed to load players",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!players || players.length === 0) {
      console.log("set-result: no players found for game", gameId);
      return new Response(
        JSON.stringify({
          success: true,
          picksScored: scoredRows.length,
          playersUpdated: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let playersUpdated = 0;

    // 4b) For each player, sum all their picks points_awarded and update total_points
    for (const player of players) {
      const { data: playerPicks, error: playerPicksError } = await supabase
        .from("picks")
        .select("points_awarded")
        .eq("player_id", player.id);

      if (playerPicksError) {
        console.error(
          `set-result: error loading picks for player ${player.id}`,
          playerPicksError
        );
        continue;
      }

      const totalPoints = (playerPicks || []).reduce(
        (sum, p) => sum + (p.points_awarded || 0),
        0
      );

      const { error: updatePlayerError } = await supabase
        .from("players")
        .update({ total_points: totalPoints })
        .eq("id", player.id);

      if (updatePlayerError) {
        console.error(
          `set-result: error updating total_points for player ${player.id}`,
          updatePlayerError
        );
      } else {
        playersUpdated += 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        picksScored: scoredRows.length,
        playersUpdated,
      }),
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
