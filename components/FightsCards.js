"use client";

import Image from "next/image";
import FighterFlag from "./FighterFlag"; // adjust path if needed

export default function FightsSection({
  fights,
  picks,
  picksLocked,
  updatePick,
}) {
  return (
    <section className="space-y-0">
      {fights.map((fight, index) => {
        const fightPick = picks[fight.id] || {
          winner: "",
          method: "",
          round: "",
        };

        console.log("index", index);

        // ✅ When fights are reversed (F5 → F1), the "previous" chronological fight is index + 1
        const prevFight = index < fights.length - 1 ? fights[index + 1] : null;

        console.log("prevFight", prevFight);

        // has the previous fight been fully scored?
        const prevScored =
          !prevFight || // top fight should be current if unscored
          (prevFight.result_method != null &&
            prevFight.result_winner != null &&
            prevFight.result_round != null);

        // is this fight completely unscored?
        const currentUnscored =
          fight.result_method == null &&
          fight.result_winner == null &&
          fight.result_round == null;

        // ✅ ONLY the first unscored-after-scored fight becomes current
        const isCurrentFight = prevScored && currentUnscored;

        const isWinnerA = fightPick.winner === "A";
        const isWinnerB = fightPick.winner === "B";
        const selectedRound = fightPick.round || "0";

        // consider fight "scored" if any official result field is set
        const isScored =
          !!fight.result_winner ||
          !!fight.result_method ||
          (fight.result_round !== null && fight.result_round !== undefined);

        // Official results from DB
        const resultWinner = fight.result_winner || null; // "A" | "B" | null
        const resultMethod = fight.result_method || null; // "KO" | "DEC" | "SUB" | null
        const resultRound =
          fight.result_round !== null && fight.result_round !== undefined
            ? String(fight.result_round)
            : null;

        // Player picks
        const pickWinner = fightPick.winner || null;
        const pickMethod = fightPick.method || null;
        const pickRound = fightPick.round || null;

        // Correctness flags
        const correctWinner =
          isScored && pickWinner && resultWinner && pickWinner === resultWinner;
        const correctMethod =
          isScored && pickMethod && resultMethod && pickMethod === resultMethod;
        const correctRound =
          isScored && pickRound && resultRound && pickRound === resultRound;

        // Card background
        const cardBg = isScored ? "bg-gray-100 opacity-90 " : "bg-white";

        return (
          <div key={fight.id} className={`border-b border-gray-300 ${cardBg}`}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-[25px] border-b border-gray-300 hidden">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                  Fight {index + 1}
                </span>
                {isScored && (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    Scored
                  </span>
                )}
              </div>
              <span className="text-x text-gray-500 uppercase">Main Card</span>
            </div>

            {/* Body */}
            <div className="px-4 py-6 space-y-5 relative">
              {/* Badge placeholder for later */}
              {isCurrentFight && (
                <div
                  className="
                    absolute animate-pulse top-[25px] left-1/2 -translate-x-1/2 uppercase flex items-center gap-2 text-xs px-4 py-[2px] rounded-full bg-red-800
                  "
                >
                  <span className="inline-flex items-center gap-1 text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    Ready
                  </span>
                </div>
              )}

              {/* Fighters row */}
              <div className="flex flex-row items-start justify-between gap-4">
                {/* Fighter A */}
                <button
                  type="button"
                  disabled={picksLocked}
                  onClick={() =>
                    !picksLocked && updatePick(fight.id, "winner", "A")
                  }
                  className={`flex-1 flex flex-col items-center sm:items-start px-0 pt-3 pb-0 transition-all 
                      ${
                        isScored
                          ? resultWinner === "A"
                            ? "bg-[linear-gradient(90deg,#C79D14_0%,#D6B373_100%)] border-none  text-white"
                            : pickWinner === "A"
                            ? "bg-black-300 text-white"
                            : " text-black"
                          : isWinnerA
                          ? "border-black bg-black text-white"
                          : "border-transparent hover:border-gray-300 text-black"
                      }
                      ${picksLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Image
                    src="/fighter-1.png"
                    width={120}
                    height={200}
                    alt={fight.fighter_a}
                    className="object-contain"
                  />
                  <FighterFlag
                    country={fight.fighter_a_country}
                    size={22}
                    className="mt-1"
                  />
                </button>

                {/* VS + names */}
                <div className="flex flex-col justify-center items-center px-0 m-auto gap-1.5 uppercase ">
                  <p className="text-md sm:text-base font-semibold text-black text-center w-[140px] break-words whitespace-normal">
                    {fight.fighter_a}
                  </p>

                  <p className="text-center text-[11px] uppercase tracking-[0.3em] text-gray-500">
                    VS
                  </p>

                  <p className="text-md sm:text-base font-semibold text-black text-center w-[140px] break-words whitespace-normal">
                    {fight.fighter_b}
                  </p>
                </div>

                {/* Fighter B */}
                <button
                  type="button"
                  disabled={picksLocked}
                  onClick={() =>
                    !picksLocked && updatePick(fight.id, "winner", "B")
                  }
                  className={`flex-1 flex flex-col items-center sm:items-end px-0 pt-3 pb-0 transition-all 
                      ${
                        isScored
                          ? resultWinner === "B"
                            ? "bg-[linear-gradient(90deg,#C79D14_0%,#D6B373_100%)] border-none  text-white"
                            : pickWinner === "B"
                            ? "bg-black text-white"
                            : " text-black"
                          : isWinnerB
                          ? "border-black bg-black text-white"
                          : "border-transparent hover:border-gray-300 text-black"
                      }
                      ${picksLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Image
                    src="/fighter-2.png"
                    width={120}
                    height={200}
                    alt={fight.fighter_b}
                    className="object-contain"
                  />
                  <FighterFlag
                    country={fight.fighter_b_country}
                    size={22}
                    className="mt-1"
                  />
                </button>
              </div>

              {/* Method row */}
              <div className="space-y-2">
                <p className="text-[11px] uppercase text-gray-500 hidden">
                  Method
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                  {[
                    { key: "KO", label: "Knockout" },
                    { key: "DEC", label: "Decision" },
                    { key: "SUB", label: "Submission" },
                  ].map((m) => {
                    const selected = fightPick.method === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        disabled={picksLocked}
                        onClick={() =>
                          !picksLocked && updatePick(fight.id, "method", m.key)
                        }
                        className={`rounded-none border px-3 py-2 font-semibold uppercase tracking-wide transition-all
                            ${
                              isScored
                                ? m.key === resultMethod
                                  ? "bg-[linear-gradient(90deg,#C79D14_0%,#D6B373_100%)] border-none text-white "
                                  : pickMethod === m.key
                                  ? "bg-black text-white"
                                  : "bg-white text-black border-gray-300"
                                : selected
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-300 hover:bg-gray-100"
                            }
                            ${picksLocked ? "cursor-not-allowed " : ""}`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Round section */}
              <div className="space-y-2">
                {isScored ? (
                  <>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((round) => {
                        const isPicked = String(round) === String(pickRound);
                        const isCorrect = String(round) === String(resultRound);

                        let boxStyle =
                          "w-8 h-8 flex items-center justify-center text-[11px] font-bold border";

                        if (isCorrect) {
                          boxStyle +=
                            "transition-all bg-[linear-gradient(90deg,#C79D14_0%,#D6B373_100%)] text-black border-amber-500 text-white";
                        } else if (isPicked) {
                          boxStyle += " bg-black text-white border-black";
                        } else {
                          boxStyle += " bg-white text-gray-600 border-gray-300";
                        }

                        return (
                          <div key={round} className={boxStyle}>
                            R{round}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase text-gray-500 hidden">
                        Round
                      </p>
                      <p className="text-xs text-black font-semibold">
                        {fightPick.round
                          ? `Round ${fightPick.round}`
                          : "Choose a round"}
                      </p>
                    </div>

                    <div className="px-1">
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={1}
                        value={selectedRound}
                        disabled={picksLocked}
                        onChange={(e) =>
                          updatePick(fight.id, "round", String(e.target.value))
                        }
                        className={`w-full accent-black ${
                          picksLocked ? "cursor-not-allowed" : "cursor-pointer"
                        }`}
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                        <span>0</span>
                        <span>R1</span>
                        <span>R2</span>
                        <span>R3</span>
                        <span>R4</span>
                        <span>R5</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {fights.length === 0 && (
        <p className="text-sm text-gray-500">
          No fights configured for this game yet.
        </p>
      )}
    </section>
  );
}
