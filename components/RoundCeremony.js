// components/RoundCeremony.js
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function RoundCeremony({ flash, players, onClose }) {
  const [stage, setStage] = useState("user"); // "user" | "top" | "bottom"

  const winnerSoundRef = useRef(null);
  const loserSoundRef = useRef(null);

  // Sort players by total_points (highest → lowest)
  const sortedPlayers = [...(players || [])].sort(
    (a, b) => (b.total_points || 0) - (a.total_points || 0)
  );

  const topPlayer = sortedPlayers[0] || null;
  const bottomPlayer =
    sortedPlayers.length > 0 ? sortedPlayers[sortedPlayers.length - 1] : null;

  // Sequence:
  // 1) User result
  // 2) After 3s => top scorer (+happy sound)
  // 3) After 33s => lowest scorer (+sad sound)
  useEffect(() => {
    if (!flash) return;

    setStage("user");

    const timers = [];

    // Stage 2: top scorer (after 4s)
    timers.push(
      setTimeout(() => {
        setStage("top");
        if (winnerSoundRef.current) {
          winnerSoundRef.current.currentTime = 0;
          winnerSoundRef.current.play().catch(() => {});
        }
      }, 4000)
    );

    // Stage 3: lowest scorer (after 8s total)
    timers.push(
      setTimeout(() => {
        setStage("bottom");
        if (loserSoundRef.current) {
          loserSoundRef.current.currentTime = 0;
          loserSoundRef.current.play().catch(() => {});
        }
      }, 8000)
    );

    // Auto-close after all stages (12s total)
    timers.push(
      setTimeout(() => {
        if (onClose) onClose();
      }, 12000)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [flash, onClose]);

  // If there's no flash event, render nothing (hooks already ran safely above)
  if (!flash) return null;

  const labelText =
    stage === "user"
      ? flash.type === "miss"
        ? "Fight Result"
        : "Bang!"
      : stage === "top"
      ? "Top Scorer"
      : "Lowest Scorer";

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          flash.type === "jackpot"
            ? "bg-gray-900/90"
            : flash.type === "partial"
            ? "bg-yellow-500/90"
            : "bg-red-800/90"
        }`}
      >
        <div className="text-center space-y-4 animate-pulse max-w-md mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-black/70">
            {labelText}
          </p>

          {/* Stage 1: user's own result */}
          {stage === "user" && (
            <>
              {flash.type === "jackpot" && (
                <>
                  <h2 className="text-3xl font-extrabold drop-shadow-lg">
                    YOU JUST GOT {flash.points} POINTS!
                  </h2>
                  <p className="text-sm font-semibold">
                    Winner + Method + Round... you nailed everything 🔥
                  </p>
                </>
              )}

              {flash.type === "partial" && (
                <>
                  <h2 className="text-3xl font-extrabold drop-shadow-lg">
                    +{flash.points} POINTS!
                  </h2>
                  <p className="text-sm font-semibold">
                    Nice pick — you hit part of it. Keep it rolling 👊
                  </p>
                </>
              )}

              {flash.type === "miss" && (
                <>
                  <h2 className="text-3xl font-extrabold drop-shadow-lg">
                    YOU GOT NOTHING 💀
                  </h2>
                  <p className="text-sm font-semibold">
                    That one hurt. New fight, new chance.
                  </p>
                </>
              )}
            </>
          )}

          {/* Stage 2: top scorer */}
          {stage === "top" && topPlayer && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-400 shadow-lg">
                <Image
                  src={topPlayer.photo_url || "/fighter-1.png"}
                  width={96}
                  height={96}
                  alt={topPlayer.display_name || topPlayer.name || "Top player"}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-extrabold drop-shadow-lg text-emerald-300">
                {topPlayer.display_name || topPlayer.name || "Top Player"}
              </h2>
              <p className="text-lg font-bold text-white">
                {topPlayer.total_points || 0} POINTS
              </p>
              <p className="text-sm font-semibold text-emerald-100">
                Highest score this fight – they’re on fire 🔥
              </p>
            </div>
          )}

          {/* Stage 3: lowest scorer */}
          {stage === "bottom" && bottomPlayer && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-red-500 shadow-lg">
                <Image
                  src={bottomPlayer.photo_url || "/fighter-1.png"}
                  width={96}
                  height={96}
                  alt={
                    bottomPlayer.display_name ||
                    bottomPlayer.name ||
                    "Lowest player"
                  }
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-extrabold drop-shadow-lg text-red-100">
                {bottomPlayer.display_name ||
                  bottomPlayer.name ||
                  "Tough Night"}
              </h2>
              <p className="text-lg font-bold text-white">
                {bottomPlayer.total_points || 0} POINTS
              </p>
              <p className="text-sm font-semibold text-red-100">
                Rough one… but there’s still time to come back 💀
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ceremony sounds */}
      <audio ref={winnerSoundRef} src="/sounds/happy.mp3" preload="auto" />
      <audio ref={loserSoundRef} src="/sounds/sad.mp3" preload="auto" />
    </>
  );
}
