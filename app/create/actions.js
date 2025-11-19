"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateGameCode } from "@/lib/gameCode";

export async function createGameAction(formData) {
  const gameName = formData.get("gameName") || "UFC Main Card";
  const hostName = formData.get("hostName") || "Host";

  const code = generateGameCode();

  // 1) Create game with explicit lobby status
  const { data: games, error: gameError } = await supabase
    .from("games")
    .insert([
      {
        name: gameName,
        host_name: hostName,
        code,
        status: "lobby",
      },
    ])
    .select();

  if (gameError || !games || !games[0]) {
    console.error("Create game error:", gameError);
    throw new Error("Failed to create game");
  }

  const game = games[0];

  // 2) Create host as a player in this game
  const { data: players, error: playerError } = await supabase
    .from("players")
    .insert([
      {
        game_id: game.id,
        display_name: hostName,
        is_ready: false,
        // later you can add is_admin: true if you add that column
      },
    ])
    .select();

  if (playerError || !players || !players[0]) {
    console.error("Create host player error:", playerError);
    throw new Error("Failed to create host player");
  }

  const hostPlayer = players[0];

  // 3) Basic placeholder fights (later: real UFC card)
  const fights = [
    {
      fighter_a: "Jon Jones",
      fighter_b: "Daniel Cormier",
      fighter_a_country: "US",
      fighter_b_country: "US",
      order_index: 1,
      game_id: game.id,
    },
    {
      fighter_a: "Conor McGregor",
      fighter_b: "Khabib Nurmagomedov",
      fighter_a_country: "IE",
      fighter_b_country: "RU",
      order_index: 2,
      game_id: game.id,
    },
    {
      fighter_a: "Israel Adesanya",
      fighter_b: "Alex Pereira",
      fighter_a_country: "NZ",
      fighter_b_country: "BR",
      order_index: 3,
      game_id: game.id,
    },
    {
      fighter_a: "Max Holloway",
      fighter_b: "Alexander Volkanovski",
      fighter_a_country: "US",
      fighter_b_country: "AU",
      order_index: 4,
      game_id: game.id,
    },
    {
      fighter_a: "Amanda Nunes",
      fighter_b: "Valentina Shevchenko",
      fighter_a_country: "BR",
      fighter_b_country: "KG",
      order_index: 5,
      game_id: game.id,
    },
  ].map((f) => ({ ...f, game_id: game.id }));

  const { error: fightsError } = await supabase.from("fights").insert(fights);

  if (fightsError) {
    console.error("Create fights error:", fightsError);
    throw new Error("Failed to create fights");
  }

  // 4) Redirect host to host screen *with their playerId in the URL*
  //    So the host page can set the correct cookie client-side.
  redirect(`/game/${code}/host?playerId=${hostPlayer.id}`);
}
