"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"

type AnyMap<T = any> = Record<string, T>

export default function PicksPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [closedEvents, setClosedEvents] = useState<any[]>([])
  const [userPicksByEvent, setUserPicksByEvent] = useState<AnyMap<any[]>>({})

  const [pointsByEvent, setPointsByEvent] = useState<AnyMap<number>>({})
  const [ranksByEvent, setRanksByEvent] = useState<AnyMap<number | string>>({})
  const [recentByPlayer, setRecentByPlayer] = useState<AnyMap<any>>({})
  const [nextByPlayer, setNextByPlayer] = useState<AnyMap<any>>({})

  useEffect(() => {
    loadPage()
  }, [])

  async function loadPage() {
    setLoading(true)

    const userResp = await supabase.auth.getUser()
    const currentUser = userResp?.data?.user ?? null

    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    const { data: memberships } = await supabase
      .from("fantasy_event_users")
      .select("fantasy_event_id, points, rank")
      .eq("user_id", currentUser.id)

    const membershipEventIds = memberships?.map((m) => m.fantasy_event_id) ?? []

    const pointsMap: AnyMap<number> = {}
    const ranksMap: AnyMap<number | string> = {}

    for (const m of memberships ?? []) {
      pointsMap[m.fantasy_event_id] = m.points ?? 0
      ranksMap[m.fantasy_event_id] = m.rank ?? "-"
    }

    setPointsByEvent(pointsMap)
    setRanksByEvent(ranksMap)

    const { data: picks } = await supabase
      .from("fantasy_picks")
      .select(`
        fantasy_event_id,
        player_id,
        players (
          id,
          first_name,
          last_name,
          position,
          player_picture,
          total_player_fantasy_pts,
          teams (
            id,
            team_name,
            gender
          )
        )
      `)
      .eq("user_id", currentUser.id)

    const pickEventIds = picks?.map((p) => p.fantasy_event_id) ?? []
    const eventIds = Array.from(new Set([...membershipEventIds, ...pickEventIds]))

    if (eventIds.length === 0) {
      setClosedEvents([])
      setUserPicksByEvent({})
      setLoading(false)
      return
    }

    const { data: events } = await supabase
      .from("fantasy_events")
      .select(`
        id,
        name,
        description,
        draft_status,
        draft_date,
        curling_events (
          id,
          name,
          start_date
        )
      `)
      .in("id", eventIds)

    const closed = (events ?? []).filter(
      (e) => e.draft_status === "locked" || e.draft_status === "archived"
    )

    const picksByEvent: AnyMap<any[]> = {}
    ;(picks ?? []).forEach((p) => {
      if (!picksByEvent[p.fantasy_event_id]) {
        picksByEvent[p.fantasy_event_id] = []
      }
      picksByEvent[p.fantasy_event_id].push(p)
    })

    setUserPicksByEvent(picksByEvent)
    setClosedEvents(closed)

    const curlingEventIds = closed
      .map((e: any) => e.curling_events?.id)
      .filter(Boolean)

    let allGames: any[] = []

    if (curlingEventIds.length > 0) {
      const { data: games } = await supabase
        .from("games")
        .select(`
          id,
          game_datetime,
          team1_id,
          team2_id,
          team1:teams!games_team1_id_fkey ( team_name ),
          team2:teams!games_team2_id_fkey ( team_name )
        `)
        .in("curling_event_id", curlingEventIds)
        .order("game_datetime", { ascending: true })

      allGames = games ?? []
    }

    const playerIds = (picks ?? []).map((p: any) => p.player_id)

    const { data: recentDraws } = await supabase
      .from("draws")
      .select(`
        player_id,
        indv_pct,
        team_pct,
        won,
        score_diff,
        fantasy_pts,
        game:games (
          id,
          game_datetime,
          team1_id,
          team2_id,
          team1:teams!games_team1_id_fkey ( team_name ),
          team2:teams!games_team2_id_fkey ( team_name )
        )
      `)
      .in("player_id", playerIds)
      .order("game_datetime", { foreignTable: "games", ascending: false })

    const recentMap: AnyMap<any> = {}

    for (const row of recentDraws ?? []) {
      const key = String(row.player_id)
      if (!recentMap[key]) {
        recentMap[key] = row
      }
    }

    setRecentByPlayer(recentMap)

    const { data: nextDraws } = await supabase
      .from("games")
      .select(`
        id,
        game_datetime,
        team1_id,
        team2_id,
        team1:teams!games_team1_id_fkey ( team_name ),
        team2:teams!games_team2_id_fkey ( team_name )
      `)
      .gt("game_datetime", new Date().toISOString())
      .order("game_datetime", { ascending: true })

    const safeNextDraws = nextDraws ?? []
    const nextMap: AnyMap<any> = {}

    for (const p of picks ?? []) {
      const rawPlayer = p.players as any

      const player = Array.isArray(rawPlayer) ? rawPlayer[0] : rawPlayer
      if (!player) continue

      const rawTeam = player.teams as any
      const team = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam
      const teamId = team?.id
      if (!teamId) continue

      const nextGame = safeNextDraws.find(
        (g: any) => g.team1_id === teamId || g.team2_id === teamId
      )

      if (nextGame) {
        nextMap[p.player_id] = nextGame
      }
    }

    setNextByPlayer(nextMap)

    setLoading(false)
  }

  return (
    <>
      <LoggedInNavBar />
        <div className="w-full px-6 py-10 flex justify-center">
          <main className="w-full max-w-screen-xl bg-white shadow-md p-8 min-h-[500px] rounded-lg">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-6">Your leagues</h1>

                {closedEvents.length === 0 && (
                  <div className="text-gray-600">You have no current teams.</div>
                )}

                <div className="space-y-10">
                  {closedEvents.map((ev: any) => {
                    const picks = userPicksByEvent[ev.id] ?? []
                    const totalPoints = pointsByEvent[ev.id] ?? 0
                    const rank = ranksByEvent[ev.id] ?? "-"
                    return (
                      <div key={ev.id} className="space-y-4">

                        {/* League Header */}
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-2xl font-semibold">{ev.name}</h2>
                            <div className="text-gray-500 text-sm">
                              {ev.curling_events?.name ?? "Unknown Event"} •{" "}
                              {ev.curling_events?.start_date
                                ? new Date(ev.curling_events.start_date).toLocaleDateString()
                                : "No date"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-gray-500 text-sm">Total Points</div>
                            <div className="text-xl font-bold">{totalPoints}</div>
                            <div className="text-gray-500 text-sm">Rank: {rank}</div>
                          </div>
                        </div>

                        {/* Player Table */}
                        <div className="overflow-hidden rounded-lg"> 
                          <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-100 text-gray-700">
                              <tr>
                                <th className="py-2 px-3 text-left">Position</th>
                                <th className="py-2 px-3 text-left"></th>
                                <th className="py-2 px-3 text-left">Name</th>
                                <th className="py-2 px-3 text-left">Team</th>
                                <th className="py-2 px-3 text-left bg-blue-200">Recent Game</th>
                                <th className="py-2 px-3 text-left bg-blue-200">Indv %</th>
                                <th className="py-2 px-3 text-left bg-blue-200">W/L</th>
                                <th className="py-2 px-3 text-left bg-blue-200">Score Diff</th>
                                <th className="py-2 px-3 text-left bg-blue-200">Fantasy Pts</th>
                                <th className="py-2 px-3 text-left">Next Game</th>
                                <th className="py-2 px-3 text-left">Total Fantasy Pts</th>
                              </tr>
                            </thead>
                            <tbody>
                              {picks.map((p: any, idx: number) => {
                                const player = p.players
                                if (!player) return null

                                const team = player.teams
                                const teamId = team?.id

                                const recent = recentByPlayer[p.player_id]

                                let recentOpponent = "N/A"
                                if (recent?.game) {
                                  const g = recent.game
                                  const isTeam1 = g.team1_id === teamId
                                  recentOpponent = isTeam1
                                    ? g.team2?.team_name
                                    : g.team1?.team_name
                                }

                                const next = nextByPlayer[p.player_id]

                                let nextOpponent = "N/A"
                                if (next) {
                                  const isTeam1 = next.team1_id === teamId
                                  nextOpponent = isTeam1
                                    ? next.team2?.team_name
                                    : next.team1?.team_name
                                }

                                return (
                                  <tr key={player.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="py-2 px-3">{player.position ?? "N/A"}</td>

                                    <td className="py-2 px-3">
                                      <div className="w-8 h-8 bg-gray-300 rounded-full" />
                                    </td>

                                    <td className="py-2 px-3 font-medium">
                                      {player.first_name} {player.last_name}
                                    </td>

                                    <td className="py-2 px-3">
                                      {team?.team_name ?? "N/A"}
                                    </td>

                                    <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                      {recent?.game ? (
                                        <>
                                          <div className="font-medium">
                                            {new Date(recent.game.game_datetime).toLocaleString()}
                                          </div>
                                          <div className="text-gray-600 text-xs">vs {recentOpponent}</div>
                                        </>
                                      ) : (
                                        <div className="text-gray-500">N/A</div>
                                      )}
                                    </td>

                                    <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                      {recent?.indv_pct ?? "N/A"}
                                    </td>

                                    <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                      {recent ? (recent.won ? "W" : "L") : "N/A"}
                                    </td>

                                    <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                      {recent?.score_diff ?? "N/A"}
                                    </td>

                                    <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                      {recent?.fantasy_pts ?? "N/A"}
                                    </td>

                                  <td className="py-2 px-3">
                                      {next ? (
                                        <>
                                          <div className="font-medium">
                                            {new Date(next.game_datetime).toLocaleString()}
                                          </div>
                                          <div className="text-gray-600 text-xs">vs {nextOpponent}</div>
                                        </>
                                      ) : (
                                        <div className="text-gray-500">N/A</div>
                                      )}
                                    </td>
                                    
                                    <td className="py-2 px-3">
                                      {player?.total_player_fantasy_pts ?? "-"}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
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
