// app/join/actions.js
"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import fs from "fs/promises";
import path from "path";

export async function joinGameAction(formData) {
  const rawCode = (formData.get("code") || "").trim();
  const displayName = (formData.get("displayName") || "").trim();
  const photoData = formData.get("playerPhotoData"); // base64 data URL from hidden input

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

  // 3) Save selfie if provided
  try {
    if (
      photoData &&
      typeof photoData === "string" &&
      photoData.startsWith("data:image")
    ) {
      // Strip data URL prefix
      const base64Data = photoData.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      const playersDir = path.join(process.cwd(), "public", "players");
      await fs.mkdir(playersDir, { recursive: true });

      const filename = `${player.id}.jpg`;
      const filePath = path.join(playersDir, filename);

      await fs.writeFile(filePath, buffer);

      const photoUrl = `/players/${filename}`;

      const { error: photoUpdateError } = await supabase
        .from("players")
        .update({ photo_url: photoUrl })
        .eq("id", player.id);

      if (photoUpdateError) {
        console.error("Join game - photoUpdateError:", photoUpdateError);
      }
    } else {
      console.warn("Join game - No selfie data provided.");
    }
  } catch (err) {
    console.error("Join game - failed to save player photo:", err);
    // Don't block joining if image fails, just log it.
  }

  // 4) Redirect to card WITH the playerId in the URL
  redirect(`/game/${game.code}/card?playerId=${player.id}`);
}
