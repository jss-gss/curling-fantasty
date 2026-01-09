"use client"

import { useEffect, useState } from "react"

export default function GameTicker() {
  const [games, setGames] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/upcoming-games")
      .then(res => res.json())
      .then(setGames)
  }, [])

  if (!games.length) return null

  return (
    <div className="w-full bg-white border-b border-t border-gray-200 py-2">
      <div className="max-w-screen-xl mx-auto overflow-x-auto whitespace-nowrap px-4 flex gap-3">
        {games.map((g) => {
          const date = new Date(g.game_datetime)
          const formatted = date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
          })

          return (
            <div
              key={g.id}
              className="px-4 py-1 bg-gray-100 rounded-full text-sm text-gray-800 flex-shrink-0 border border-gray-300"
            >
              {g.team1.team_name} vs {g.team2.team_name} • {formatted}
            </div>
          )
        })}
      </div>
    </div>
  )
}
