"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function GameMenu() {
  const pathname = usePathname();

  // Extract game code from any route like /game/[code]/...
  const match = pathname.match(/\/game\/([^/]+)/);
  const code = match ? match[1].toUpperCase() : null;

  // Only show on game routes
  if (!code) return null;

  const navItems = [
    { label: "Lobby", href: `/game/${code}/lobby` },
    { label: "Card", href: `/game/${code}/card` },
    { label: "Leaderboard", href: `/game/${code}/leaderboard` },
    { label: "Host", href: `/game/${code}/host` },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex gap-2 bg-zinc-900/90 border border-zinc-700 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-lg">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-xs px-3 py-1 rounded-lg bg-zinc-800 hover:bg-yellow-500 hover:text-black transition font-medium"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
