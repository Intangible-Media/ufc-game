"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateGameCode } from "@/lib/gameCode";

export async function createGameAction(formData) {
  const gameName = formData.get("gameName") || "UFC Main Card";
  const hostName = formData.get("hostName") || "Host";

  const code = generateGameCode();

  // 1) create game
  const { data: games, error } = await supabase
    .from("games")
    .insert([{ name: gameName, host_name: hostName, code }])
    .select();

  if (error || !games || !games[0]) {
    console.error(error);
    throw new Error("Failed to create game");
  }

  const game = games[0];

  // 2) basic placeholder fights (later: real UFC card)
  const fights = [
    {
      fighter_a: "Jack Della Maddalena",
      fighter_b: "Opponent 1",
      order_index: 1,
    },
    { fighter_a: "Fighter 2A", fighter_b: "Fighter 2B", order_index: 2 },
    { fighter_a: "Fighter 3A", fighter_b: "Fighter 3B", order_index: 3 },
  ].map((f) => ({ ...f, game_id: game.id }));

  const { error: fightsError } = await supabase.from("fights").insert(fights);

  if (fightsError) {
    console.error(fightsError);
    throw new Error("Failed to create fights");
  }

  // 3) redirect host to host screen for this game
  redirect(`/game/${code}/host`);
}
