"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function GameMenu() {
  const pathname = usePathname();

  // Grab the game code from /game/[code]/...
  const match = pathname.match(/\/game\/([^/]+)/);
  const code = match ? match[1].toUpperCase() : null;

  const [status, setStatus] = useState(null); // "lobby" | "live" | etc.
  const [isHost, setIsHost] = useState(false); // is THIS browser the host?

  // If we're not on a /game/[code]/ route, show nothing
  if (!code) return null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1) Load the game by code (for status + id)
        const { data: game, error: gameError } = await supabase
          .from("games")
          .select("id, status")
          .eq("code", code)
          .single();

        if (cancelled) return;

        if (gameError || !game) {
          console.error("GameMenu: game load error", gameError);
          return;
        }

        setStatus(game.status);

        // 2) Try to read playerId from cookie (might not exist yet)
        const cookieVal =
          typeof document !== "undefined"
            ? document.cookie
                .split("; ")
                .find((row) => row.startsWith("playerId="))
            : null;

        const playerId = cookieVal ? cookieVal.split("=")[1] : null;

        // If we don't know who this player is, just don't show Host
        if (!playerId) {
          setIsHost(false);
          return;
        }

        // 3) Load players for this game, first joined = host
        const { data: players, error: playersError } = await supabase
          .from("players")
          .select("id, created_at")
          .eq("game_id", game.id)
          .order("created_at", { ascending: true });

        if (cancelled) return;

        if (playersError || !players || players.length === 0) {
          if (playersError) {
            console.error("GameMenu: players load error", playersError);
          }
          setIsHost(false);
          return;
        }

        const hostPlayer = players[0]; // first player = host (simple rule)
        setIsHost(hostPlayer.id === playerId);
      } catch (e) {
        if (!cancelled) {
          console.error("GameMenu: load error", e);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const isLive = status === "live";

  // Build nav based on status + host-ness
  const navItems = [
    !isLive && { label: "Lobby", href: `/game/${code}/lobby` }, // hide when live
    { label: "Card", href: `/game/${code}/card` },
    { label: "Leaderboard", href: `/game/${code}/leaderboard` },
    isHost && { label: "Host", href: `/game/${code}/host` }, // only if this browser is host
  ].filter(Boolean);

  if (!navItems.length) return null;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex gap-2 bg-zinc-900/90 border border-zinc-700 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-lg">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-xs px-3 py-1 rounded-lg bg-zinc-800 hover:bg-yellow-500 hover:text-black transition font-medium"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
