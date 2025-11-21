"use client";

import React from "react";
import Image from "next/image";
import { Avatar } from "flowbite-react";

export default function Leaderboard({
  players = [],
  currentPlayerId = null,
  className = "",
}) {
  // Sort by points desc, then by name as a tiebreaker
  const sorted = [...players].sort((a, b) => {
    if ((b.points || 0) === (a.points || 0)) {
      return (a.name || "").localeCompare(b.name || "");
    }
    return (b.points || 0) - (a.points || 0);
  });

  return (
    <section
      className={`w-full max-w-xl mx-auto rounded-0 bg-gradient-to-b from-[#f3f3f3] to-[#e7e7e7] px-5 py-6 shadow-sm ${className}`}
    >
      {/* Header */}
      <h2 className="text-center text-2xl uppercase text-black mb-4">
        Leaderboard
      </h2>

      <div className="space-y-2">
        {sorted.map((player, idx) => {
          console.log("player", player);
          const rank = idx + 1;
          const isYou = player.id && player.id === currentPlayerId;
          const isTop = rank === 1;

          const baseRow =
            "flex items-center justify-between rounded-lg px-4 py-3 text-xs md:text-sm transition-colors";

          const rowStyles = isYou
            ? "bg-neutral-900 text-white"
            : "bg-white text-neutral-900";

          return (
            <div key={player.id ?? rank} className={`${baseRow} ${rowStyles}`}>
              {/* Left side: rank + name */}
              <div className="flex items-center gap-3">
                {/* Rank pill */}
                <div
                  className={`flex items-center justify-center w-6 h-6 text-[11px]  rounded-full ${
                    isYou ? "text-white" : "text-neutral-900"
                  }`}
                >
                  #{rank}
                </div>

                {/* <Image
                  src={player.photo_url || "/fighter-1.png"}
                  alt={player.display_name}
                  width={60}
                  height={60}
                  className="w-[40px] h-[40px] object-cover rounded-full"
                /> */}
              </div>
              <Avatar img={player.photo_url || "/fighter-1.png"} rounded>
                <div className="space-y-1 font-medium dark:text-white">
                  <div className="flex flex-col">
                    <span
                      className={`tracking-wide uppercase ${
                        isYou ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {player.display_name || "Unknown Player"}
                      {isYou && " (YOU)"}
                    </span>
                  </div>
                </div>
              </Avatar>

              {/* Right side: crown (for #1) + points */}
              <div className="flex items-center gap-2">
                {isTop && (
                  <span
                    className={`text-lg ${
                      isYou ? "text-amber-300" : "text-amber-400"
                    }`}
                    aria-label="Leader"
                    title="Leader"
                  >
                    👑
                  </span>
                )}
                <span
                  className={`text-sm md:text-base font-bold tracking-wide ${
                    isYou ? "text-white" : "text-neutral-700"
                  }`}
                >
                  {player.total_points ?? 0}
                </span>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <p className="text-center text-xs text-neutral-500 py-4">
            No players yet. Share your game code and get people in here.
          </p>
        )}
      </div>
    </section>
  );
}
