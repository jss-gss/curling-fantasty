"use client"

import { useEffect, useState } from "react"

function toET(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }) + " ET"
}

export default function GameTicker() {
  const [games, setGames] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/upcoming-games")
      .then(res => res.json())
      .then(setGames)
  }, [])

  if (!games.length) return null

return (
  <div className="bg-white shadow-md p-4 rounded-lg">
    <h3 className="text-sm font-bold text-center text-[#1f4785] mb-2">
      Upcoming Round Robin Games
    </h3>

    <div className="flex flex-col gap-[clamp(0.5rem,1vw,1rem)] text-center">
      {games.map((g) => {
        return (
          <div
            key={g.id}
            className="bg-blue-50 p-3 border border-blue-300 rounded-md"
          >
            <div className="font-semibold text-xs text-base mb-1">
              {g.team1.team_name} vs {g.team2.team_name}
            </div>
            <div className="text-xs mb-1 text-black">
              {g.team1.curling_event.year} {g.team1.curling_event.name}
            </div>
            <div className="text-xs text-black">
              {toET(g.game_datetime)}
            </div>
          </div>
        )
      })}
    </div>
  </div>
)
}
