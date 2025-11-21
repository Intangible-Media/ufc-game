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

  // 3) Main card fights for this game (based on current UFC card)
  // Reversed order: Fight 5 → Fight 1 (main event shown first)
  const fights = [
    // Fight 5 – Merab Dvalishvili vs Petr Yan (Bantamweight Title Bout)
    {
      fighter_a: "Merab Dvalishvili",
      fighter_b: "Petr Yan",
      fighter_a_country: "GE", // Georgia
      fighter_b_country: "RU", // Russia
      order_index: 1,
    },
    // Fight 4 – Alexandre Pantoja vs Joshua Van (Flyweight Title Bout)
    {
      fighter_a: "Alexandre Pantoja",
      fighter_b: "Joshua Van",
      fighter_a_country: "BR", // Brazil
      fighter_b_country: "MM", // Myanmar
      order_index: 2,
    },
    // Fight 3 – Brandon Moreno vs Tatsuro Taira (Flyweight Bout)
    {
      fighter_a: "Brandon Moreno",
      fighter_b: "Tatsuro Taira",
      fighter_a_country: "MX", // Mexico
      fighter_b_country: "JP", // Japan
      order_index: 3,
    },
    // Fight 2 – Henry Cejudo vs Payton Talbott (Bantamweight Bout)
    {
      fighter_a: "Henry Cejudo",
      fighter_b: "Payton Talbott",
      fighter_a_country: "US", // United States
      fighter_b_country: "US", // United States
      order_index: 4,
    },
    // Fight 1 – Jan Błachowicz vs Bogdan Guskov (Light Heavyweight Bout)
    {
      fighter_a: "Jan Błachowicz",
      fighter_b: "Bogdan Guskov",
      fighter_a_country: "PL", // Poland
      fighter_b_country: "UZ", // Uzbekistan
      order_index: 5,
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
