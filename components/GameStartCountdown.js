"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GameStartCountdown({ gameId, initialStartedAt }) {
  const [startedAt, setStartedAt] = useState(initialStartedAt || null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [seconds, setSeconds] = useState(null);

  const countdownStartedRef = useRef(false);
  const audioRef = useRef(null);

  // Load sound once
  useEffect(() => {
    // Put a file in /public/sounds/start-bell.mp3
    audioRef.current = new Audio("/sounds/its-time.mp3");
  }, []);

  // Realtime subscription to games row
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-start-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updated = payload.new;
          console.log("Countdown: game row changed", updated);
          if (updated?.started_at) {
            setStartedAt(updated.started_at);
          }
        }
      )
      .subscribe((status) => {
        console.log("Countdown subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Drive countdown from startedAt
  useEffect(() => {
    if (!startedAt) return;

    const targetTime = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = targetTime - now;

    console.log("Countdown: detected startedAt", startedAt, "diffMs", diffMs);

    if (diffMs <= 0 || countdownStartedRef.current) return;

    countdownStartedRef.current = true;
    setShowCountdown(true);

    let remaining = Math.ceil(diffMs / 1000);
    setSeconds(remaining);

    const interval = setInterval(() => {
      const nowInner = Date.now();
      const diffInner = targetTime - nowInner;
      const secs = Math.ceil(diffInner / 1000);

      if (secs <= 0) {
        setSeconds(0);

        // Play sound
        if (audioRef.current) {
          audioRef.current
            .play()
            .catch((err) => console.warn("Countdown sound blocked:", err));
        }

        // Hide overlay shortly after
        setTimeout(() => {
          setShowCountdown(false);
        }, 1000);

        clearInterval(interval);
        return;
      }

      setSeconds(secs);
    }, 200);

    return () => clearInterval(interval);
  }, [startedAt]);

  if (!showCountdown || seconds === null) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-yellow-500 mb-4">
          Fight Night
        </p>
        <p className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]">
          {seconds}
        </p>
      </div>
    </div>
  );
}
