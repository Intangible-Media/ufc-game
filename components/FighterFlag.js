// components/Flag.js
"use client";

import * as Flags from "country-flag-icons/react/3x2";
import { getCountryName } from "@/lib/misc";

export default function Flag({ country = "US", size = 24, className = "" }) {
  const code = country.toUpperCase();
  const FlagComponent = Flags[code];
  const countryName = getCountryName(country);

  if (!FlagComponent) {
    // Fallback
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          style={{ width: size, height: size }}
          className="bg-neutral-700 rounded-sm flex items-center justify-center text-[10px] text-white"
        >
          🌎
        </div>
        <span className="text-xs text-neutral-700">{countryName}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* FLAG ON LEFT */}
      <div
        style={{ width: size, height: size }}
        className="rounded-sm overflow-hidden flex-shrink-0"
      >
        <FlagComponent
          title={code}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>

      {/* NAME ON RIGHT */}
      <span className="text-sm uppercase">{countryName}</span>
    </div>
  );
}
