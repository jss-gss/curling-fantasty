"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import LoggedInNavBar from "@/components/LoggedInNavBar"
import GameTicker from "@/components/GameTicker"

type League = {
  id: string
  name: string
  status: "closed" | "archived"
}

type LeaderboardRow = {
  user_id: string
  total_points: number
  profile: {
    id: string
    username: string
    first_name: string
    last_name: string
  }
}

export default function LeagueLeaderboardPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [filter, setFilter] = useState<"current" | "past">("current")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeagues() {
      const { data } = await supabase
        .from("fantasy_events")
        .select("id, name, status")
        .in("status", ["closed", "archived"])
        .order("draft_date", { ascending: false })

      setLeagues((data as League[]) ?? [])
      setLoading(false)
    }

    loadLeagues()
  }, [])

  async function loadLeaderboard(leagueId: string) {
    setLeaderboard([])

    const { data: totals } = await supabase.rpc("get_league_totals_by_event", {
      event_id: leagueId,
    })

    if (!totals) return

    const userIds = totals.map((t: any) => t.user_id)

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name")
      .in("id", userIds)

    const profileMap = Object.fromEntries(
      profiles!.map((p) => [p.id, p])
    )

    const rows: LeaderboardRow[] = totals
      .map((t: any) => ({
        user_id: t.user_id,
        total_points: t.total_points,
        profile: profileMap[t.user_id],
      }))
      .sort((a: { total_points: number }, b: { total_points: number }) => b.total_points - a.total_points)

    setLeaderboard(rows)
  }

  function handleLeagueSelect(id: string) {
    setSelectedLeague(id)
    loadLeaderboard(id)
  }

  const filteredLeagues = leagues.filter((l) =>
    filter === "current" ? l.status === "closed" : l.status === "archived"
  )

  return (
    <>
      <GameTicker />
      <LoggedInNavBar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">League Leaderboards</h1>

        {/* FILTER BUTTONS */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter("current")}
            className={`px-4 py-2 rounded-md ${
              filter === "current"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Current Leagues
          </button>

          <button
            onClick={() => setFilter("past")}
            className={`px-4 py-2 rounded-md ${
              filter === "past"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Past Leagues
          </button>
        </div>

        {/* LEAGUE SELECTOR */}
        <select
          className="border p-2 rounded-md mb-6 w-full"
          onChange={(e) => handleLeagueSelect(e.target.value)}
        >
          <option value="">Select a league...</option>
          {filteredLeagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* LEADERBOARD TABLE */}
        {selectedLeague && (
          <>
            <h2 className="text-2xl font-semibold mb-4">
              {leagues.find((l) => l.id === selectedLeague)?.name} — Leaderboard
            </h2>

            <table className="w-full border-collapse shadow-md">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3">Rank</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">First</th>
                  <th className="p-3">Last</th>
                  <th className="p-3">Total Points</th>
                </tr>
              </thead>

              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.user_id} className="border-b">
                    <td className="p-3 font-bold">{i + 1}</td>
                    <td className="p-3">{row.profile?.username}</td>
                    <td className="p-3">{row.profile?.first_name}</td>
                    <td className="p-3">{row.profile?.last_name}</td>
                    <td className="p-3">{row.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}
