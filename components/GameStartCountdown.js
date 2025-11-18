"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GameStartCountdown({ gameId, initialStartedAt }) {
  const [startedAt, setStartedAt] = useState(initialStartedAt || null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [seconds, setSeconds] = useState(null);
  const [showItsTime, setShowItsTime] = useState(false);

  const countdownStartedRef = useRef(false);
  const audioRef = useRef(null);
  const hideOverlayTimeoutRef = useRef(null);

  // Load sound once and read its duration
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

  // 1) Realtime subscription to games row
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

  // 2) Fallback polling in case realtime isn't firing
  useEffect(() => {
    if (!gameId) return;
    if (startedAt) return; // stop polling once we have a start time

    let isCancelled = false;

    async function checkOnce() {
      try {
        const { data, error } = await supabase
          .from("games")
          .select("started_at")
          .eq("id", gameId)
          .single();

        if (error) {
          console.warn("Countdown poll error:", error.message);
          return;
        }

        if (!isCancelled && data?.started_at) {
          console.log("Countdown: started_at detected via polling", data);
          setStartedAt(data.started_at);
        }
      } catch (err) {
        console.warn("Countdown poll unexpected error:", err);
      }
    }

    const intervalId = setInterval(() => {
      checkOnce();
    }, 1000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [gameId, startedAt]);

  // 3) Drive countdown + "It'sssssss Timeee!" sequence synced to audio
  useEffect(() => {
    if (!startedAt) return;

    const targetTime = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = targetTime - now;

    console.log("Countdown: detected startedAt", startedAt, "diffMs", diffMs);

    if (diffMs <= 0 || countdownStartedRef.current) return;

    countdownStartedRef.current = true;
    setShowCountdown(true);
    setShowItsTime(false);

    let remaining = Math.ceil(diffMs / 1000);
    setSeconds(remaining);

    const interval = setInterval(() => {
      const nowInner = Date.now();
      const diffInner = targetTime - nowInner;
      const secs = Math.ceil(diffInner / 1000);

      if (secs <= 0) {
        setSeconds(0);

        // 🔊 Play "It'sssssss Timeee!" audio
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

        // Swap to the ITS TIME overlay text
        setShowItsTime(true);

        // Keep overlay visible for the length of the audio (fallback ~4s)
        const durationMs =
          audioRef.current && !isNaN(audioRef.current.duration)
            ? audioRef.current.duration * 1000
            : 4000;

        if (hideOverlayTimeoutRef.current) {
          clearTimeout(hideOverlayTimeoutRef.current);
        }

        hideOverlayTimeoutRef.current = setTimeout(() => {
          setShowCountdown(false);
          setShowItsTime(false);
        }, durationMs + 250); // tiny buffer

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
