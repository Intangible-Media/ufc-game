// components/UFCHeader.js
"use client";

import Image from "next/image";

export default function UFCHeader({
  eventNumber,
  rank,
  totalPoints,
  gameName,
}) {
  return (
    <div className="relative w-full bg-[#0a0a0a] border-t-4 border-[#D4A84F] overflow-hidden aspect-[2/1]">
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
      <div className="relative z-10 px-4 py-8 flex flex-col">
        {/* UFC Logo + Event Number */}
        <div className="text-left space-y-1 mb-5">
          <Image
            src="/ufc-logo-gold.png" // <- replace with your banner image
            alt="UFC Logo"
            width={45}
            height={22.5}
            priority
          />
        </div>

        <h1 className="text-xl font-extrabold uppercase mb-2 hidden">
          {gameName}
        </h1>

        {/* YOU RANK # */}
        <p className="text-sm uppercase tracking-widest text-white UFCSansRegular">
          You Rank #{rank}
        </p>

        {/* TOTAL POINTS */}
        <h2 className="text-[23px] uppercase text-white">Total Points</h2>

        <div className="relative inline-block">
          {/* Gold bar */}

          <h1 className="relative font-ufcHead text-[36px] md:text-6xl font-black text-white leading-none inline-block">
            {totalPoints}

            {/* Gradient underline bar */}
            <span
              className="absolute left-0 bottom-1 w-full h-4 rounded-0 z-[-1]"
              style={{
                background: "linear-gradient(90deg, #B3A061 0%, #D6B373 100%)",
              }}
            ></span>
          </h1>
        </div>
      </div>
    </div>
  );
}
