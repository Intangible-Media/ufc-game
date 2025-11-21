// components/FightProgressTracker.js
"use client";

export default function FightProgressTracker({
  fightTracker = [],
  gameStatus,
  className = "",
}) {
  if (!fightTracker.length) return null;

  // Status label ("Lobby – picks open", etc.)
  const renderStatus = () => {
    if (!gameStatus) return null;

    if (gameStatus === "lobby") {
      return (
        <span className="text-amber-600 font-medium">Lobby – picks open</span>
      );
    }

    if (gameStatus === "live") {
      return (
        <span className="text-green-600 font-medium">Live – picks locked</span>
      );
    }

    return <span className="text-neutral-600 capitalize">{gameStatus}</span>;
  };

  // Sort in real fight order:
  // lowest order_index = first fight on the card
  const orderedTracker = [...fightTracker].sort((a, b) => {
    const ao =
      typeof a.order_index === "number"
        ? a.order_index
        : Number(String(a.label || "").replace(/\D+/g, "")) || 0;
    const bo =
      typeof b.order_index === "number"
        ? b.order_index
        : Number(String(b.label || "").replace(/\D+/g, "")) || 0;
    return ao - bo;
  });

  const totalFights = orderedTracker.length;
  const scoredCount = orderedTracker.filter(
    (item) => item.status === "scored"
  ).length;
  const progressPercent =
    totalFights > 0 ? Math.min(100, (scoredCount / totalFights) * 100) : 0;

  // Human-readable status for tooltip
  const statusText = (status) => {
    if (status === "scored") return "Scored";
    if (status === "current") return "Current fight";
    return "Upcoming";
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header row */}
      <div className="flex justify-between items-center mb-3.5">
        <p className="uppercase text-xs text-gray-900 flex items-center gap-1">
          Status:
          {renderStatus()}
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-gray-900">
          Fight Progress
        </p>
      </div>

      {/* Progress bar background */}
      <div className="relative w-full h-1.5 rounded-full bg-neutral-200 mb-4 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* FULL-WIDTH STEP BAR WITH LABELS */}
      <ol className="flex items-center w-full">
        {orderedTracker.map((item, index) => {
          const isLast = index === orderedTracker.length - 1;
          const isScored = item.status === "scored";
          const isCurrent = item.status === "current";

          // Display number F5 → F1 (bottom fight gets highest number)
          const displayNumber = totalFights - index; // e.g., 5,4,3,2,1

          // Connector line between steps
          const connectorBase =
            "after:content-[''] after:flex-1 after:h-1 after:border-b after:border-4 after:inline-block after:mx-2 after:rounded-full flex-1";
          const connectorClass = isLast
            ? "flex-1" // last step: no line after
            : isScored
            ? `${connectorBase} after:border-emerald-400`
            : isCurrent
            ? `${connectorBase} after:border-amber-400`
            : `${connectorBase} after:border-neutral-300`;

          // Step circle style
          const circleBase =
            "flex items-center justify-center w-8 h-8 rounded-full lg:w-10 lg:h-10 shrink-0 transition-all duration-300 ease-out";
          const circleClass = isScored
            ? `${circleBase} bg-emerald-50 border border-emerald-500 text-emerald-500 scale-100`
            : isCurrent
            ? `${circleBase} bg-amber-50 border border-amber-400 text-amber-400 scale-110 shadow-[0_0_18px_rgba(245,158,11,0.5)]`
            : `${circleBase} bg-neutral-100 border border-neutral-400 text-neutral-400 scale-100`;

          const iconClass = "w-4 h-4";

          const tooltip = `${
            item.label || `Fight ${displayNumber}`
          } · ${statusText(item.status)}`;

          return (
            <li
              key={item.id}
              className={`flex flex-col items-center ${
                !isLast ? connectorClass : "flex-1"
              }`}
            >
              {/* Circle + tooltip */}
              <div className="flex items-center justify-center" title={tooltip}>
                <span className={circleClass}>
                  {isScored ? (
                    // ✅ Scored
                    <svg
                      className={iconClass}
                      aria-hidden="true"
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
                    // 🔥 Current
                    <svg
                      className={iconClass}
                      aria-hidden="true"
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
                    <svg
                      className={iconClass}
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="7"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </span>
              </div>

              {/* Number label (F5, F4, ..., F1) */}
              <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-neutral-600">
                F{displayNumber}
              </span>

              {/* Optional fight label below (small + truncated) */}
              {item.label && (
                <span className="mt-0.5 text-[10px] text-neutral-500 max-w-[80px] text-center line-clamp-2 leading-tight hidden">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
