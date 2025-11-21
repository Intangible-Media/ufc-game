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
  // 2) After 4s => top scorer (+happy sound)
  // 3) After 8s => lowest scorer (+sad sound)
  // 4) After 12s => close
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

  // If there's no flash event, render nothing
  if (!flash) return null;

  const labelText =
    stage === "user"
      ? flash.type === "miss"
        ? "Fight Result"
        : "Bang!"
      : stage === "top"
      ? "Top Scorer"
      : "Lowest Scorer";

  // Choose background player for winner/loser stages
  const bgPlayer =
    stage === "top" ? topPlayer : stage === "bottom" ? bottomPlayer : null;
  const bgImageSrc = bgPlayer?.photo_url || "/fighter-1.png";

  return (
    <>
      {/* Full-screen ceremony overlay */}
      <div className="fixed inset-0 z-50">
        {/* Background image for winner/loser stages */}
        {bgPlayer && (stage === "top" || stage === "bottom") && (
          <Image
            src={bgImageSrc}
            alt={
              bgPlayer.display_name ||
              bgPlayer.name ||
              (stage === "top" ? "Top player" : "Lowest player")
            }
            fill
            priority
            className="object-cover"
          />
        )}

        {/* Fallback solid background for user stage */}
        {!bgPlayer && (
          <div
            className={`absolute inset-0 ${
              flash.type === "jackpot"
                ? "bg-gray-900"
                : flash.type === "partial"
                ? "bg-yellow-500"
                : "bg-red-800"
            }`}
          />
        )}

        {/* Dark overlay to make text readable */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full px-4">
          <div className="text-center space-y-4 max-w-lg mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-400">
              {labelText}
            </p>

            {/* Stage 1: user's own result */}
            {stage === "user" && (
              <>
                {flash.type === "jackpot" && (
                  <>
                    <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg text-white">
                      YOU JUST GOT {flash.points} POINTS!
                    </h2>
                    <p className="text-sm md:text-base font-semibold text-neutral-100">
                      Winner + Method + Round... you nailed everything 🔥
                    </p>
                  </>
                )}

                {flash.type === "partial" && (
                  <>
                    <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg text-white">
                      +{flash.points} POINTS!
                    </h2>
                    <p className="text-sm md:text-base font-semibold text-neutral-100">
                      Nice pick — you hit part of it. Keep it rolling 👊
                    </p>
                  </>
                )}

                {flash.type === "miss" && (
                  <>
                    <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg text-white">
                      YOU GOT NOTHING 💀
                    </h2>
                    <p className="text-sm md:text-base font-semibold text-neutral-100">
                      That one hurt. New fight, new chance.
                    </p>
                  </>
                )}
              </>
            )}

            {/* Stage 2: top scorer (winner full-screen background) */}
            {stage === "top" && topPlayer && (
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg text-emerald-300">
                  {topPlayer.display_name || topPlayer.name || "Top Player"}
                </h2>
                <p className="text-lg md:text-2xl font-black text-white">
                  {topPlayer.total_points || 0} POINTS
                </p>
                <p className="text-sm md:text-base font-semibold text-emerald-100">
                  Highest score right now – they&apos;re on fire 🔥
                </p>
              </div>
            )}

            {/* Stage 3: lowest scorer (loser full-screen background) */}
            {stage === "bottom" && bottomPlayer && (
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg text-red-200">
                  {bottomPlayer.display_name ||
                    bottomPlayer.name ||
                    "Tough Night"}
                </h2>
                <p className="text-lg md:text-2xl font-black text-white">
                  {bottomPlayer.total_points || 0} POINTS
                </p>
                <p className="text-sm md:text-base font-semibold text-red-100">
                  Rough one… but there&apos;s still time to come back 💀
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ceremony sounds */}
      <audio ref={winnerSoundRef} src="/sounds/happy.mp3" preload="auto" />
      <audio ref={loserSoundRef} src="/sounds/sad.mp3" preload="auto" />
    </>
  );
}
