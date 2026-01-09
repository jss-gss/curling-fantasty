"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"

export default function DashboardHome() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [closedEvents, setClosedEvents] = useState<any[]>([])
  const [userPicksByEvent, setUserPicksByEvent] = useState<Record<string, any[]>>({})
  const [pointsByEvent, setPointsByEvent] = useState<Record<string, number>>({})
  const [ranksByEvent, setRanksByEvent] = useState<Record<string, number>>({})
  const [playerRecentById, setPlayerRecentById] = useState<Record<string, any>>({})
  const [playerNextById, setPlayerNextById] = useState<Record<string, any>>({})

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)

    // 1. Load user
    const userResp = await supabase.auth.getUser()
    const currentUser = userResp?.data?.user ?? null

    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    // 2. Load memberships
    const { data: memberships } = await supabase
      .from("fantasy_event_users")
      .select("fantasy_event_id")
      .eq("user_id", currentUser.id)

    const membershipEventIds = memberships?.map((m) => m.fantasy_event_id) ?? []

    // 3. Load picks
    const { data: pickRows } = await supabase
      .from("fantasy_picks")
      .select(`
        fantasy_event_id,
        player_id,
        position_id,
        players (
          id,
          first_name,
          last_name,
          player_picture,
          player_event_teams (
            team:teams ( team_name )
          )
        ),
        positions ( position_title )
      `)
      .eq("user_id", currentUser.id)

    const pickEventIds = pickRows?.map((p) => p.fantasy_event_id) ?? []

    // Combine event IDs
    const eventIds = Array.from(new Set([...membershipEventIds, ...pickEventIds]))

    if (eventIds.length === 0) {
      setClosedEvents([])
      setUserPicksByEvent({})
      setPointsByEvent({})
      setRanksByEvent({})
      setLoading(false)
      return
    }

    // 4. Load events (correct schema)
    const { data: events } = await supabase
      .from("fantasy_events")
      .select(`
        id,
        name,
        description,
        curling_event_id,
        draft_date,
        status,
        curling_events (
          name,
          start_date
        )
      `)
      .in("id", eventIds)
      .order("draft_date", { ascending: true })

    // Only closed events appear on Picks page
    const closed = events?.filter((e) => e.status === "closed") ?? []
    setClosedEvents(closed)

    // 5. Organize picks by event
    const picksByEvent: Record<string, any[]> = {}
    pickRows?.forEach((p) => {
      const id = p.fantasy_event_id
      picksByEvent[id] = picksByEvent[id] ?? []
      picksByEvent[id].push(p)
    })
    setUserPicksByEvent(picksByEvent)

    // 6. Load points + ranks
    const { data: points } = await supabase
      .from("fantasy_points")
      .select("fantasy_event_id, user_id, points")
      .in("fantasy_event_id", eventIds)

    const pointsMap: Record<string, number> = {}
    const ranksMap: Record<string, number> = {}

    closed.forEach((ev) => {
      const ptsForEvent = points?.filter((r) => r.fantasy_event_id === ev.id) ?? []
      const sorted = ptsForEvent.slice().sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      const userRow = ptsForEvent.find((r) => r.user_id === currentUser.id)

      pointsMap[ev.id] = userRow?.points ?? 0
      const rank = sorted.findIndex((r) => r.user_id === currentUser.id)
      ranksMap[ev.id] = rank === -1 ? 0 : rank + 1
    })

    setPointsByEvent(pointsMap)
    setRanksByEvent(ranksMap)

    // 7. Load recent + next games for all players
    const playerIds = new Set<string>()
    closed.forEach((ev) => {
      (picksByEvent[ev.id] ?? []).forEach((p) => {
        if (p.player_id) playerIds.add(p.player_id)
      })
    })

    if (playerIds.size > 0) {
      const ids = Array.from(playerIds)

      // Recent games
      const { data: recentGames } = await supabase
        .from("draws")
        .select(`
          id,
          player_id,
          game_datetime,
          opponent_team:teams ( team_name ),
          percentage,
          won,
          score_for,
          score_against,
          fantasy_points
        `)
        .in("player_id", ids)
        .lt("game_datetime", new Date().toISOString())
        .order("game_datetime", { ascending: false })

      const recentMap: Record<string, any> = {}
      recentGames?.forEach((g) => {
        if (!recentMap[g.player_id]) recentMap[g.player_id] = g
      })
      setPlayerRecentById(recentMap)

      // Next games
      const { data: nextGames } = await supabase
        .from("draws")
        .select(`
          id,
          player_id,
          game_datetime,
          opponent_team:teams ( team_name )
        `)
        .in("player_id", ids)
        .gt("game_datetime", new Date().toISOString())
        .order("game_datetime", { ascending: true })

      const nextMap: Record<string, any> = {}
      nextGames?.forEach((g) => {
        if (!nextMap[g.player_id]) nextMap[g.player_id] = g
      })
      setPlayerNextById(nextMap)
    }

    setLoading(false)
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <>
      <GameTicker />
      <LoggedInNavBar />

      <div className="w-full px-6 py-10 flex justify-center">
        <main className="w-full max-w-screen-xl bg-white shadow-md p-8 min-h-[500px]">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-6">Your leagues</h1>

              {closedEvents.length === 0 && (
                <div className="text-gray-600">You have no current teams.</div>
              )}

              <div className="space-y-6">
                {closedEvents.map((ev) => {
                  const picks = userPicksByEvent[ev.id] ?? []

                  return (
                    <div key={ev.id} className="w-full mb-6">
                      <div className="flex items-stretch w-full shadow-md overflow-hidden">

                        {/* LEFT PANEL */}
                        <div className="w-1/4 min-w-[220px] bg-gray-50 p-4 flex flex-col justify-center items-center text-center">
                          <div className="font-semibold text-lg leading-tight">{ev.name}</div>
                          <div className="text-xs text-gray-500 truncate mt-1">{ev.description ?? ""}</div>

                          <div className="mt-4 w-full text-sm text-gray-700 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">Total points</span>
                              <span className="font-medium">{pointsByEvent[ev.id] ?? 0}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">Rank</span>
                              <span className="font-medium">{ranksByEvent[ev.id] || "-"}</span>
                            </div>

                            <div className="mt-2">
                              <div className="text-xs text-gray-500">Curling event</div>
                              <div className="text-sm font-medium">{ev.curling_events?.name ?? "—"}</div>
                            </div>

                            <div className="mt-2 text-xs text-gray-400">
                              <div>Started: {ev.curling_events?.start_date ? new Date(ev.curling_events.start_date).toLocaleDateString() : "—"}</div>
                              <div>Draft closed: {ev.closed_draft_date ? new Date(ev.closed_draft_date).toLocaleDateString() : "—"}</div>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT TABLE */}
                        <div className="flex-1 -ml-px">
                          <table className="w-full border-collapse text-sm bg-white">
                            <thead className="bg-gray-100 text-gray-700">
                              <tr>
                                <th className="py-2 px-3 text-left">Position</th>
                                <th className="py-2 px-3 text-left">Player</th>
                                <th className="py-2 px-3 text-left">Team</th>
                                <th className="py-2 px-3 text-left">Recent Game</th>
                                <th className="py-2 px-3 text-left">Individual %</th>
                                <th className="py-2 px-3 text-left">W/L</th>
                                <th className="py-2 px-3 text-left">Score</th>
                                <th className="py-2 px-3 text-left">Fantasy pts</th>
                                <th className="py-2 px-3 text-left">Next game</th>
                              </tr>
                            </thead>

                            <tbody>
                              {picks.map((p, idx) => {
                                const playerId = p.player_id
                                const recent = playerRecentById[playerId]
                                const next = playerNextById[playerId]
                                const scoreDiff = recent ? (recent.score_for - recent.score_against) : "—"

                                return (
                                  <tr key={playerId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="py-2 px-3">{p.positions?.position_title ?? "—"}</td>
                                    <td className="py-2 px-3 font-medium">{p.players?.first_name} {p.players?.last_name}</td>
                                    <td className="py-2 px-3 font-medium">{p.players?.player_event_teams?.[0]?.team?.team_name ?? "—"}</td>
                                    <td className="py-2 px-3 text-gray-600">{recent ? new Date(recent.game_datetime).toLocaleString() : "—"}</td>
                                    <td className="py-2 px-3">{recent?.percentage ?? "—"}</td>
                                    <td className="py-2 px-3">{recent ? (recent.won ? "W" : "L") : "—"}</td>
                                    <td className="py-2 px-3">{recent ? scoreDiff : "—"}</td>
                                    <td className="py-2 px-3">{recent?.fantasy_points ?? "—"}</td>
                                    <td className="py-2 px-3 text-gray-600">
                                      {next
                                        ? `${new Date(next.game_datetime).toLocaleString()} vs ${next.opponent_team?.team_name ?? "—"}`
                                        : "—"}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
