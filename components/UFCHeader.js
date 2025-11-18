// components/UFCHeader.js
"use client";

import Image from "next/image";

export default function UFCHeader({ eventNumber, rank, totalPoints }) {
  return (
    <div className="relative w-full bg-[#0a0a0a] border-t-4 border-[#D4A84F] overflow-hidden">
      {/* Background image (fighter banner) */}
      <div className="absolute inset-0">
        <Image
          src="/ufc-header.png" // <- replace with your banner image
          alt="UFC Header"
          fill
          className="object-cover opacity-100"
          priority
        />
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0"></div>

      {/* Content */}
      <div className="relative z-10 px-4 py-8 flex flex-col gap-2">
        {/* UFC Logo + Event Number */}
        <div className="text-left space-y-1">
          <Image
            src="/ufc-logo-gold.png" // <- replace with your banner image
            alt="UFC Logo"
            width={45}
            height={22.5}
            priority
          />
        </div>

        {/* YOU RANK # */}
        <p className="text-sm uppercase tracking-widest text-zinc-300">
          You Rank <span className="text-white font-bold">#{rank}</span>
        </p>

        {/* TOTAL POINTS */}
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
          Total Points
        </p>
        <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">
          <span className="text-[#D4A84F]">{totalPoints}</span>
        </h1>
      </div>
    </div>
  );
}
