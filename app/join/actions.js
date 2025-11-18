// app/join/actions.js
"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export async function joinGameAction(formData) {
  const rawCode = (formData.get("code") || "").trim();
  const displayName = (formData.get("displayName") || "").trim();

  if (!rawCode || !displayName) {
    throw new Error(
      `Game code and name are required ${rawCode} ${displayName}`
    );
  }

  const code = rawCode.toUpperCase();

  // 1) Find game by code
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, code")
    .eq("code", code)
    .single();

  if (gameError || !game) {
    console.error("Join game - gameError:", gameError);
    throw new Error("Game not found");
  }

  // 2) Create player
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert([{ game_id: game.id, display_name: displayName }])
    .select()
    .single();

  if (playerError || !player) {
    console.error("Join game - playerError:", playerError);
    throw new Error("Could not join game");
  }

  // 3) Redirect to card WITH the playerId in the URL
  // We'll read this client-side and set a cookie there.
  redirect(`/game/${game.code}/card?playerId=${player.id}`);
}
