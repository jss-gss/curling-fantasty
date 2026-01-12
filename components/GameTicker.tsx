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
  <div className="w-full bg-[#f3f4f6] border-y border-gray-200 py-2">
      <div className="max-w-screen-xl mx-auto flex items-center gap-6 px-4 overflow-x-auto whitespace-nowrap">

        {/* LEFT LABEL */}
        <span className="font-semibold text-lg" style={{ color: "#1f4785" }}>
          UPCOMING GAMES
        </span>

        {/* GAME LIST */}
        <div className="flex gap-6">
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
              <span key={g.id} className="text-lg text-gray-700">
                {g.team1.team_name} vs {g.team2.team_name} • {formatted}
              </span>
            )
          })}
        </div>

      </div>
    </div>
  )
}
