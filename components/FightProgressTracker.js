// components/FightProgressTracker.js
"use client";

export default function FightProgressTracker({
  fightTracker = [],
  gameStatus,
  className = "",
}) {
  if (!fightTracker.length) return null;

  const renderStatus = () => {
    if (!gameStatus) return null;

    if (gameStatus === "lobby") {
      return <span className="text-white font-medium">Lobby – picks open</span>;
    }

    if (gameStatus === "live") {
      return (
        <span className="text-green-400 font-semi">Live – picks locked</span>
      );
    }

    return <span className="text-neutral-600 capitalize">{gameStatus}</span>;
  };

  // Sort fights so highest order_index is first (F5 → F1)
  const orderedTracker = [...fightTracker].sort((a, b) => {
    const ao =
      typeof a.order_index === "number"
        ? a.order_index
        : Number(String(a.label || "").replace(/\D+/g, "")) || 0;
    const bo =
      typeof b.order_index === "number"
        ? b.order_index
        : Number(String(b.label || "").replace(/\D+/g, "")) || 0;

    return bo - ao;
  });

  const totalFights = orderedTracker.length;

  // Determine which fight is CURRENT based on last scored
  let computedCurrentIndex = null;

  if (gameStatus === "live") {
    const scoredIndexes = orderedTracker
      .map((item, idx) => (item.status === "scored" ? idx : -1))
      .filter((idx) => idx !== -1);

    if (scoredIndexes.length === 0) {
      // No scored fights yet → top fight is current
      computedCurrentIndex = 0;
    } else {
      const lastScored = Math.max(...scoredIndexes);
      const nextIndex = lastScored + 1;
      computedCurrentIndex = nextIndex < totalFights ? nextIndex : null;
    }
  }

  const statusText = (status) => {
    if (status === "scored") return "Scored";
    if (status === "current") return "Current fight";
    return "Upcoming";
  };

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="uppercase text-xs flex gap-1 text-black">
          Status: {renderStatus()}
        </p>
        <p className="text-xs uppercase tracking-[0.25em]">Fight Progress</p>
      </div>

      <ol className="flex items-center w-full space-x-4">
        {orderedTracker.map((item, index) => {
          const isLast = index === orderedTracker.length - 1;
          const isScored = item.status === "scored";
          const isBackendCurrent = item.status === "current";

          // If live, use computed logic, otherwise respect backend
          const isCurrent =
            gameStatus === "live"
              ? index === computedCurrentIndex
              : isBackendCurrent;

          const displayNumber = totalFights - index;

          const connector = !isLast
            ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block after:ms-4 after:rounded-full w-full"
            : "";

          const connectorColor = isScored
            ? "after:border-emerald-400"
            : isCurrent
            ? "after:border-red-700"
            : "after:border-neutral-300";

          const circleBase =
            "flex items-center justify-center w-8 h-8 lg:w-12 lg:h-12 rounded-full shrink-0 transition-all";

          const circleClass = isScored
            ? "bg-emerald-50 border border-emerald-500 text-emerald-500"
            : isCurrent
            ? "bg-red-50 border border-red-700 text-red-700 scale-110 animate-pulse"
            : "bg-neutral-100 border border-neutral-400 text-neutral-400";

          const semanticStatus = isScored
            ? "scored"
            : isCurrent
            ? "current"
            : "upcoming";

          return (
            <li
              key={item.id}
              className={`flex items-center ${connector} ${connectorColor}`}
            >
              <div
                className="flex flex-col items-center"
                title={`${
                  item.label || `Fight ${displayNumber}`
                } · ${statusText(semanticStatus)}`}
              >
                <span className={`${circleBase} ${circleClass}`}>
                  {isScored ? (
                    // ✅ Scored
                    <svg
                      className="w-5 h-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 11.917 9.724 16.5 19 7.5"
                      />
                    </svg>
                  ) : isCurrent ? (
                    // 🔥 Current (amber)
                    <svg
                      className="w-5 h-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 5v7l4 2"
                      />
                    </svg>
                  ) : (
                    // ⏳ Upcoming
                    <span className="text-sm font-bold">{displayNumber}</span>
                  )}
                </span>

                <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-neutral-500 hidden">
                  F{displayNumber}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
