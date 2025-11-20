"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GameStartCountdown({ gameId, initialStartedAt }) {
  const [startedAt, setStartedAt] = useState(initialStartedAt || null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [seconds, setSeconds] = useState(null);
  const [showItsTime, setShowItsTime] = useState(false);

  const audioRef = useRef(null);
  const hideOverlayTimeoutRef = useRef(null);
  const playedRef = useRef(false); // prevent double “It’s time” fire

  // 🔊 Load sound once
  useEffect(() => {
    const audio = new Audio("/sounds/its-time.mp3");
    audioRef.current = audio;

    const onLoaded = () => {
      console.log("Its-time audio duration:", audio.duration, "seconds");
    };

    audio.addEventListener("loadedmetadata", onLoaded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      if (hideOverlayTimeoutRef.current) {
        clearTimeout(hideOverlayTimeoutRef.current);
      }
    };
  }, []);

  // 🧲 On mount: force-load current started_at from Supabase once
  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function fetchStartTimeOnce() {
      try {
        const { data, error } = await supabase
          .from("games")
          .select("started_at")
          .eq("id", gameId)
          .single();

        if (!cancelled && !error && data?.started_at) {
          setStartedAt((prev) => prev || data.started_at); // don’t override if we already have one
        }
      } catch (err) {
        console.warn("Countdown initial fetch error:", err);
      }
    }

    fetchStartTimeOnce();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // 📡 Realtime subscription to games row (for when host presses Start)
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-start-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updated = payload.new;
          console.log("Countdown: game row changed via realtime", updated);
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

  // 🕰 Fallback polling (only if we still don’t know started_at)
  useEffect(() => {
    if (!gameId) return;
    if (startedAt) return; // once we know it, stop polling

    let isCancelled = false;

    async function checkOnce() {
      try {
        const { data, error } = await supabase
          .from("games")
          .select("started_at")
          .eq("id", gameId)
          .single();

        if (!isCancelled && !error && data?.started_at) {
          console.log("Countdown: started_at detected via polling", data);
          setStartedAt(data.started_at);
        }
      } catch (err) {
        console.warn("Countdown poll unexpected error:", err);
      }
    }

    const intervalId = setInterval(checkOnce, 1000);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [gameId, startedAt]);

  // 🎬 Drive countdown + “It’s Time!” sequence, but ONLY before the start moment
  useEffect(() => {
    if (!startedAt) return;

    const targetTime = new Date(startedAt).getTime();
    const now = Date.now();

    // ⛔ If the start moment is already in the past (with a tiny buffer),
    // don’t show the countdown or the overlay at all.
    // This prevents re-triggering when you visit /card later.
    const PAST_BUFFER_MS = 500; // 0.5s grace
    if (now > targetTime + PAST_BUFFER_MS) {
      console.log("Countdown: start time already passed, not showing overlay.");
      return;
    }

    playedRef.current = false; // reset when we get a (new) start time

    setShowCountdown(true);
    setShowItsTime(false);

    const tick = () => {
      const nowInner = Date.now();
      const diffMs = targetTime - nowInner;
      const secs = Math.ceil(diffMs / 1000);

      // If we’re at/after zero, jump into “It’s Time!” mode
      if (diffMs <= 0) {
        setSeconds(0);

        if (!playedRef.current) {
          playedRef.current = true;

          // 🔊 Play sound once
          if (audioRef.current) {
            try {
              audioRef.current.currentTime = 0;
              audioRef.current
                .play()
                .catch((err) =>
                  console.warn("Countdown sound blocked (gesture?):", err)
                );
            } catch (e) {
              console.warn("Audio play error:", e);
            }
          }

          // 📳 Big hype vibration pattern
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate([200, 80, 200, 80, 300, 80, 500]);
            } catch (e) {
              console.warn("Vibration failed:", e);
            }
          }

          // Swap overlay to “It’s Time”
          setShowItsTime(true);

          // Keep overlay visible for the audio duration (fallback ~7.3s)
          const durationMs =
            audioRef.current && !isNaN(audioRef.current.duration)
              ? audioRef.current.duration * 1000
              : 7300;

          if (hideOverlayTimeoutRef.current) {
            clearTimeout(hideOverlayTimeoutRef.current);
          }

          hideOverlayTimeoutRef.current = setTimeout(() => {
            setShowCountdown(false);
            setShowItsTime(false);
          }, durationMs + 250);
        }

        return;
      }

      // Normal countdown mode
      setSeconds(secs);
    };

    // Run immediately and then at an interval
    tick();
    const intervalId = setInterval(tick, 200);

    return () => {
      clearInterval(intervalId);
    };
  }, [startedAt]);

  // Nothing to show yet
  if (!showCountdown || seconds === null) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-yellow-500 mb-4">
          Fight Night
        </p>

        {showItsTime ? (
          <div className="space-y-2 ufc-intro-container">
            <p className="text-5xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.9)]">
              It&apos;sssss
            </p>
            <p className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,1)]">
              Timeee!
            </p>
          </div>
        ) : (
          <p className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]">
            {seconds}
          </p>
        )}
      </div>
    </div>
  );
}
