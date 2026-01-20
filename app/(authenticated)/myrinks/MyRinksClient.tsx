"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import type { AchievementId } from "@/lib/achievementIcons"
import { getAchievementIcon } from "@/lib/getAchievementIcon"
import AchievementModal from "@/components/AchievementModal"

type AnyMap<T = any> = Record<string, T>

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

export default function PicksPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [closedEvents, setClosedEvents] = useState<any[]>([])
  const [completedLeagues, setCompletedLeagues] = useState<any[]>([])
  const [eligibleForStats, setEligibleForStats] = useState<any[]>([])
  const [pointsByEvent, setPointsByEvent] = useState<AnyMap<number>>({})
  const [ranksByEvent, setRanksByEvent] = useState<AnyMap<number | string>>({})

  const [userPicksByEvent, setUserPicksByEvent] = useState<AnyMap<any[]>>({})
  const [recentByPlayer, setRecentByPlayer] = useState<AnyMap<any>>({})
  const [nextByPlayer, setNextByPlayer] = useState<AnyMap<any>>({})

  const [achievements, setAchievements] = useState<any[]>([])
  const [achievementModal, setAchievementModal] = useState<AchievementId | null>(null)
  const [modalQueue, setModalQueue] = useState<AchievementId[]>([])
  const achievementFromDB = achievements.find(a => a.code === achievementModal)

  const hasRunCleanSweep = useRef(false)

  const enqueueModal = (code: AchievementId) => {
    setModalQueue(prev => [...prev, code])
  }

  useEffect(() => {
    if (!achievementModal && modalQueue.length > 0) {
      const timer = setTimeout(() => {
        setAchievementModal(modalQueue[0])
        setModalQueue(prev => prev.slice(1))
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [achievementModal, modalQueue])

  useEffect(() => {
    const loadAchievements = async () => {
      const { data } = await supabase
        .from("achievements")
        .select("id, code, name, description")
      if (data) setAchievements(data)
    }
    loadAchievements()
  }, [])

  useEffect(() => {
    const loadPage = async () => {
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

      const pointsMap: Record<string, number> = {}
      const ranksMap: Record<string, number | string> = {}

      for (const m of memberships ?? []) {
        pointsMap[m.fantasy_event_id] = m.points
        ranksMap[m.fantasy_event_id] = m.rank
      }

      setPointsByEvent(pointsMap)
      setRanksByEvent(ranksMap)

      const membershipEventIds = memberships?.map(m => m.fantasy_event_id) ?? []

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
            teams ( id, team_name )
          )
        `)
        .eq("user_id", currentUser.id)

      const pickEventIds = picks?.map(p => p.fantasy_event_id) ?? []
      const eventIds = Array.from(new Set([...membershipEventIds, ...pickEventIds]))

      if (eventIds.length === 0) {
        setClosedEvents([])
        setCompletedLeagues([])
        setEligibleForStats([])
        setUserPicksByEvent({})
        setLoading(false)
        return
      }

      const { data: events } = await supabase
        .from("fantasy_events")
        .select(`
          id,
          slug,
          name,
          is_public,
          draft_status,
          curling_events ( id, name, year, location )
        `)
        .in("id", eventIds)

      const current = events?.filter(
        e => e.draft_status === "closed" || e.draft_status === "locked"
      ) ?? []

      const completed = events?.filter(
        e => e.draft_status === "completed"
      ) ?? []

      const eligible = events?.filter(
        e => e.draft_status === "locked" || e.draft_status === "completed"
      ) ?? []

      setClosedEvents(current)
      setCompletedLeagues(completed)
      setEligibleForStats(eligible)

      const picksByEvent: AnyMap<any[]> = {}
      for (const p of picks ?? []) {
        if (!picksByEvent[p.fantasy_event_id]) picksByEvent[p.fantasy_event_id] = []
        picksByEvent[p.fantasy_event_id].push(p)
      }
      setUserPicksByEvent(picksByEvent)

      const playerIds = (picks ?? []).map(p => p.player_id)

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
        if (!recentMap[key]) recentMap[key] = row
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

      const nextMap: AnyMap<any> = {}
      for (const p of picks ?? []) {
        const rawPlayer = p.players as any
        const player = Array.isArray(rawPlayer) ? rawPlayer[0] : rawPlayer
        if (!player) continue
        const rawTeam = player.teams as any
        const team = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam
        const teamId = team?.id
        if (!teamId) continue
        const nextGame = (nextDraws ?? []).find(
          g => g.team1_id === teamId || g.team2_id === teamId
        )
        if (nextGame) nextMap[p.player_id] = nextGame
      }
      setNextByPlayer(nextMap)

      setLoading(false)
    }

    loadPage()
  }, [])

  useEffect(() => {
    if (!user) return
    if (!achievements.length) return
    if (!Object.keys(recentByPlayer).length) return
    if (!completedLeagues.length && !closedEvents.length) return

    if (!hasRunCleanSweep.current) {
      hasRunCleanSweep.current = true

      const hasPerfect = Object.values(recentByPlayer).some(
        (d: any) => d?.indv_pct === 100
      )

      if (hasPerfect) {
        const row = achievements.find((a: any) => a.code === "CLEAN_SWEEP")
        if (row) {
          const checkExisting = async () => {
            const { data: existing } = await supabase
              .from("user_achievements")
              .select("id")
              .eq("user_id", user.id)
              .eq("achievement_id", row.id)
              .maybeSingle()

            if (!existing) {
              await supabase.from("user_achievements").insert({
                user_id: user.id,
                achievement_id: row.id
              })
              enqueueModal("CLEAN_SWEEP")
            }
          }
          checkExisting()
        }
      }
    }
  }, [
      user,
      achievements,
      recentByPlayer,
      completedLeagues,
      closedEvents
  ])

  return (
    <>
      <div className="w-full px-6 py-10 flex flex-col items-center gap-10">
        {/* CARD 1 — Completed Leagues */}
        {completedLeagues.length > 0 && (
          <main className="w-full max-w-screen-xl bg-white shadow-md p-8 rounded-lg">
            <h1 className="text-3xl font-bold mb-6">Completed Fantasy Leagues</h1>

            <div className="space-y-10">
              {completedLeagues.map((league: any) => {
                const picks = userPicksByEvent[league.id] ?? []
                return (
                  <div key={league.id} className="space-y-6">

                    {/* HEADER */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2
                            className="text-2xl font-semibold hover:underline cursor-pointer"
                            onClick={() => router.push(`/league/${league.slug}`)}>
                            {league.name}
                          </h2>
                          {league.is_public ? (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              public
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                              private
                            </span>
                          )}

                          {league.is_commissioner && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                              draw master
                            </span>
                          )}

                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                            completed
                          </span>
                        </div>

                        {league.curling_events && (
                          <p className="text-gray-700 flex items-center justify-between">
                            {league.curling_events.year} {league.curling_events.name} in{" "}
                            {league.curling_events.location}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => router.push(`/league/${league.slug}`)}
                        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
                      >
                        View Results
                      </button>
                    </div>

                    {/* TABLE FOR THIS LEAGUE */}
                    <div className="overflow-hidden rounded-lg">
                      <table className="w-full border-collapse text-sm">
                       <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="py-2 px-3 text-left">Position</th>
                          <th className="py-2 px-3 text-left"></th>
                          <th className="py-2 px-3 text-left">Name</th>
                          <th className="py-2 px-3 text-left">Team</th>
                          <th className="py-2 px-3 text-left bg-blue-200">Recent Draw</th>
                          <th className="py-2 px-3 text-center bg-blue-200">Indv %</th>
                          <th className="py-2 px-3 text-center bg-blue-200">W/L</th>
                          <th className="py-2 px-3 text-center bg-blue-200">Score Diff</th>
                          <th className="py-2 px-3 text-left bg-blue-200">Fantasy Pts</th>
                          <th className="py-2 px-3 text-center">Total Fantasy Pts</th>
                        </tr>
                      </thead>

                        <tbody>
                          {picks.map((p: any, idx: number) => {
                            const player = p.players
                            if (!player) return null

                            const team = player.teams
                            const recent = recentByPlayer[p.player_id]

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

                                {/* RECENT DRAW */}
                                <td className={`py-2 px-3 ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.game ? (
                                    <>
                                      <div className="font-small">
                                        {toET(recent.game.game_datetime)}
                                      </div>
                                      <div className="text-gray-600 text-xs">
                                        vs {recent.game.team1_id === team.id
                                          ? recent.game.team2?.team_name
                                          : recent.game.team1?.team_name}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-gray-500">N/A</div>
                                  )}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.indv_pct ?? "N/A"}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent ? (recent.won ? "W" : "L") : "N/A"}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.score_diff ?? "N/A"}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.fantasy_pts ?? "N/A"}
                                </td>

                                <td className="py-2 text-center px-3">
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
          </main>
        )}

        {/* CARD 2 — Current Rinks */}
        <main className="w-full max-w-screen-xl bg-white shadow-md p-8 rounded-lg">
          <h1 className="text-3xl font-bold mb-6">Current Rinks</h1>
          {loading && <p className="w-full flex justify-center mt-20 text-gray-600"> Loading...</p>}

          {!loading && closedEvents.length === 0 && (
            <div className="text-gray-600">No current rinks.</div>
          )}

          <div className="space-y-10">
            {closedEvents.map((ev: any) => {
              const picks = userPicksByEvent[ev.id] ?? []
              const totalPoints = pointsByEvent[ev.id] ?? 0
              const rank = ranksByEvent[ev.id] ?? "-"
              const isCommissioner = ev.created_by === user?.id

              return (
                  <div key={ev.id} className="space-y-4">
                    {/* League Header */}
                    <div className="relative flex justify-between items-start">
                      {/* LEFT SIDE */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h2
                            className="text-2xl font-semibold hover:underline cursor-pointer"
                            onClick={() => router.push(`/league/${ev.slug}`)}
                          >
                            {ev.name}
                          </h2>
                          {/* Public/Private pill FIRST */}
                          {ev.is_public ? (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              public
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                              private
                            </span>
                          )}

                          {/* Commissioner pill SECOND */}
                          {isCommissioner && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                              draw master
                            </span>
                          )}
                        </div>

                        <div className="text-gray-700 flex items-center justify-between">
                          {ev.curling_events?.year ?? ""} {ev.curling_events?.name ?? "Unknown Event"} in{" "}
                          {ev.curling_events?.location ?? "Unknown Location"}
                        </div>
                      </div>

                      {/* RIGHT SIDE */}
                      <div className="text-right">
                        <div className="text-gray-500 text-sm">Total Points:</div>
                        <div className="text-xl font-bold text-center">{totalPoints}</div>
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
                            <th className="py-2 px-3 text-left bg-blue-200">Recent Draws</th>
                            <th className="py-2 px-3 text-center bg-blue-200">Indv %</th>
                            <th className="py-2 px-3 text-center bg-blue-200">W/L</th>
                            <th className="py-2 px-3 text-center bg-blue-200">Score Diff</th>
                            <th className="py-2 px-3 text-center bg-blue-200">Fantasy Pts</th>
                            <th className="py-2 px-3 text-left">Next Draw</th>
                            <th className="py-2 px-3 text-center">Total Fantasy Pts</th>
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
                                      <div className="font-small">
                                        {toET(recent.game.game_datetime)}
                                      </div>
                                      <div className="text-gray-600 text-xs">vs {recentOpponent}</div>
                                    </>
                                  ) : (
                                    <div className="text-gray-500">N/A</div>
                                  )}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.indv_pct ?? "N/A"}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent ? (recent.won ? "W" : "L") : "N/A"}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.score_diff ?? "N/A"}
                                </td>

                                <td className={`py-2 px-3 text-center ${idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                  {recent?.fantasy_pts ?? "N/A"}
                                </td>

                              <td className="py-2 px-3">
                                  {next ? (
                                    <>
                                      <div className="font-medium">
                                        {toET(next.game_datetime)}
                                      </div>
                                      <div className="text-gray-600 text-xs">vs {nextOpponent}</div>
                                    </>
                                  ) : (
                                    <div className="text-gray-500">N/A</div>
                                  )}
                                </td>
                                
                                <td className="py-2 text-center px-3">
                                  {player?.total_player_fantasy_pts ?? "-"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )})}
                </div>
            </main>
        </div>

      {achievementModal && (
        <AchievementModal
          open={true}
          onClose={() => setAchievementModal(null)}
          title={achievementFromDB?.name ?? ""}
          description={achievementFromDB?.description ?? ""}
          icon={getAchievementIcon(achievementFromDB?.code)}
        />
      )}
    </>
  )
}
