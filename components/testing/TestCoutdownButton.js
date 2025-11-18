"use client";

import { useState } from "react";
import GameStartCountdown from "@/components/GameStartCountdown";

export default function TestCountdownButton() {
  const [fakeStart, setFakeStart] = useState(null);

  function trigger() {
    const startTime = new Date(Date.now() + 5000).toISOString(); // 5 seconds from now
    setFakeStart(startTime);
  }

  return (
    <>
      <button
        onClick={trigger}
        className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg"
      >
        TEST COUNTDOWN
      </button>

      {fakeStart && (
        <GameStartCountdown gameId={"test"} initialStartedAt={fakeStart} />
      )}
    </>
  );
}
