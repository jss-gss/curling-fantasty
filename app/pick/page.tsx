"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"
console.log("Picks page module loaded")
type AnyMap<T = any> = Record<string, T>

export default function DashboardHome() {
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

    const membershipEventIds =
      memberships?.map((m: any) => m.fantasy_event_id) ?? []

    // 3. Load picks (includes player_event_teams for team & position)
    const { data: picks } = await supabase
      .from("fantasy_picks")
      .select(`
        fantasy_event_id,
        player_id,
        positions ( position_title ),
        players (
          id,
          first_name,
          last_name,
          player_event_teams ( position_id, teams ( id, team_name ), total_fantasy_points )
        )
      `)
      .eq("user_id", currentUser.id)

    const pickEventIds = picks?.map((p: any) => p.fantasy_event_id) ?? []
    const eventIds = Array.from(new Set([...membershipEventIds, ...pickEventIds]))

    if (eventIds.length === 0) {
      setClosedEvents([])
      setUserPicksByEvent({})
      setPointsByEvent({})
      setRanksByEvent({})
      setRecentByPlayer({})
      setNextByPlayer({})
      setLoading(false)
      return
    }

    // 4. Load events (closed only used for display)
    const { data: events } = await supabase
      .from("fantasy_events")
      .select(`
        id,
        name,
        description,
        status,
        draft_date,
        curling_events ( name, start_date )
      `)
      .in("id", eventIds)

    const closed = (events ?? []).filter((e: any) => e.status === "closed")
    setClosedEvents(closed)

    // 5. Organize picks by event
    const picksByEvent: AnyMap<any[]> = {}
    ;(picks ?? []).forEach((p: any) => {
      if (!picksByEvent[p.fantasy_event_id]) picksByEvent[p.fantasy_event_id] = []
      picksByEvent[p.fantasy_event_id].push(p)
    })
    setUserPicksByEvent(picksByEvent)

    // 6. Load event-level fantasy points (if you keep a separate table)
    const { data: points } = await supabase
      .from("fantasy_points")
      .select("fantasy_event_id, user_id, points")
      .in("fantasy_event_id", eventIds)

    const pointsMap: AnyMap<number> = {}
    const ranksMap: AnyMap<number | string> = {}

    closed.forEach((ev: any) => {
      const rows = (points ?? []).filter((r: any) => r.fantasy_event_id === ev.id)
      const sorted = rows.slice().sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0))
      const userRow = rows.find((r: any) => r.user_id === currentUser.id)

      pointsMap[ev.id] = userRow?.points ?? 0
      const rankIdx = sorted.findIndex((r: any) => r.user_id === currentUser.id)
      ranksMap[ev.id] = rankIdx === -1 ? "-" : rankIdx + 1
    })

    setPointsByEvent(pointsMap)
    setRanksByEvent(ranksMap)

    // 7. Load recent draws and their games (latest past draw per player)
    const playerIds = Array.from(new Set((picks ?? []).map((p: any) => p.player_id)))
    const recentMap: AnyMap<any> = {}

    if (playerIds.length > 0) {
      // 7a. Get all draws for these players
      const { data: draws, error: drawsErr } = await supabase
        .from("draws")
        .select("*")
        .in("player_id", playerIds)

      console.log("draws:", draws)
      console.log("drawsErr:", drawsErr)

      if (draws && draws.length > 0) {
        // 7b. Collect all game_ids used in those draws
        const gameIds = Array.from(
          new Set(draws.map((d: any) => d.game_id).filter(Boolean))
        )

        // 7c. Load the games for those IDs
        const { data: games, error: gamesErr } = await supabase
          .from("games")
          .select(`
            id,
            game_datetime,
            team1_id,
            team2_id,
            team1:teams!team1_id ( team_name ),
            team2:teams!team2_id ( team_name )
          `)
          .in("id", gameIds)

        console.log("games:", games)
        console.log("gamesErr:", gamesErr)

        // 7d. Index games by id for quick lookup
        const gameById: AnyMap<any> = {}
        for (const g of games ?? []) {
          gameById[g.id] = g
        }

        // 7e. For each draw, attach its game and keep the latest past game per player
        const now = new Date()

        for (const d of draws) {
          const game = gameById[d.game_id]
          if (!game || !game.game_datetime) continue

          const gameTime = new Date(game.game_datetime)
          // Only consider past games
          if (gameTime > now) continue

          const existing = recentMap[d.player_id]
          if (!existing) {
            recentMap[d.player_id] = { ...d, game }
          } else {
            const existingTime = new Date(existing.game.game_datetime)
            if (gameTime > existingTime) {
              recentMap[d.player_id] = { ...d, game }
            }
          }
        }
      }
    }

    setRecentByPlayer(recentMap)

    // 8. Load upcoming games and map to players by their team (if any)
    const { data: upcoming } = await supabase
      .from("games")
      .select(`
        id,
        game_datetime,
        team1_id,
        team2_id,
        teams!games_team1_id_fkey(team_name),
        teams!games_team2_id_fkey(team_name)
      `)
      .gt("game_datetime", new Date().toISOString())
      .order("game_datetime", { ascending: true })

    const nextMap: AnyMap<any> = {}
    ;(picks ?? []).forEach((p: any) => {
      const playerTeamId = p.players?.player_event_teams?.[0]?.teams?.id
      if (!playerTeamId) return
      const nextGame = (upcoming ?? []).find(
        (g: any) => g.team1_id === playerTeamId || g.team2_id === playerTeamId
      )
      if (nextGame) nextMap[p.player_id] = nextGame
    })

    setNextByPlayer(nextMap)
    setLoading(false)
  }

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
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-2 px-3 text-left">Position</th>
                      <th className="py-2 px-3 text-left">Pic</th>
                      <th className="py-2 px-3 text-left">Name</th>
                      <th className="py-2 px-3 text-left">Team</th>
                      <th className="py-2 px-3 text-left bg-blue-200">Recent Game</th>
                      <th className="py-2 px-3 text-left bg-blue-200">Indv %</th>
                      <th className="py-2 px-3 text-left bg-blue-200">W/L</th>
                      <th className="py-2 px-3 text-left bg-blue-200">Score Diff</th>
                      <th className="py-2 px-3 text-left bg-blue-200">Earned Pts</th>
                      <th className="py-2 px-3 text-left">Next Game</th>
                      <th className="py-2 px-3 text-left">Total FP</th>
                    </tr>
                  </thead>

                  <tbody>
                    {picks.map((p: any, idx: number) => {
                      const playerId = p.player_id
                      const recent = recentByPlayer[playerId]
                      const next = nextByPlayer[playerId]
                      const teamId = p.players?.player_event_teams?.[0]?.teams?.id

                      // Opponent name for recent game
                      let recentOpponent = "N/A"
                      if (recent?.game) {
                        const g = recent.game
                        const isTeam1 = g.team1_id === teamId

                        recentOpponent = isTeam1
                          ? g.team2?.team_name
                          : g.team1?.team_name
                      }

                      // Opponent name for next game
                      let nextOpponent = "N/A"
                      if (next) {
                        const isTeam1 = next.team1_id === teamId

                        nextOpponent = isTeam1
                          ? next.team2?.team_name
                          : next.team1?.team_name
                      }

                      return (
                        <tr
                          key={playerId}
                          className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          {/* Position */}
                          <td className="py-2 px-3">
                            {p.positions?.position_title ?? "N/A"}
                          </td>

                          {/* Pic */}
                          <td className="py-2 px-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full" />
                          </td>

                          {/* Name */}
                          <td className="py-2 px-3 font-medium">
                            {p.players?.first_name} {p.players?.last_name}
                          </td>

                          {/* Team */}
                          <td className="py-2 px-3">
                            {p.players?.player_event_teams?.[0]?.teams?.team_name ?? "N/A"}
                          </td>

                        {/* Recent Game */}
                        <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                          {recent ? (
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

                        {/* Indv % */}
                        <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                          {recent?.indv_pct ?? "N/A"}
                        </td>

                        {/* W/L */}
                        <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                          {recent ? (recent.won ? "W" : "L") : "N/A"}
                        </td>

                        {/* Score Diff */}
                        <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                          {recent?.score_diff ?? "N/A"}
                        </td>

                        {/* Earned Pts */}
                        <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                          {recent?.fantasy_points ?? "N/A"}
                        </td>

                          {/* Next Game */}
                          <td className="py-2 px-3">
                            {next ? (
                              <>
                                {new Date(next.game_datetime).toLocaleString()}
                                <br />
                                vs {nextOpponent}
                              </>
                            ) : (
                              "N/A"
                            )}
                          </td>

                          {/* Total Fantasy Points */}
                          <td className="py-2 px-3">
                            {p.players?.player_event_teams?.[0]?.total_fantasy_points ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
