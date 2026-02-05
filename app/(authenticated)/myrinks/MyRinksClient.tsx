"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter, useSearchParams } from "next/navigation"
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

function getLatestGame(row: any) {
  const gamesArr = Array.isArray(row?.games) ? row.games : row?.games ? [row.games] : []
  let best: any = null
  let bestMs = -1

  for (const g of gamesArr) {
    const dt = g?.game_datetime
    if (!dt) continue
    const ms = new Date(dt).getTime()
    if (ms > bestMs) {
      bestMs = ms
      best = g
    }
  }
  return best
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
  const [gamesCountByPlayer, setGamesCountByPlayer] = useState<AnyMap<number>>({})

  const [achievements, setAchievements] = useState<any[]>([])
  const [achievementModal, setAchievementModal] = useState<AchievementId | null>(null)
  const [modalQueue, setModalQueue] = useState<AchievementId[]>([])
  const achievementFromDB = achievements.find(a => a.code === achievementModal)
  const player_pos_order: Record<string, number> = { Lead: 1, Second: 2, "Vice Skip": 3, Skip: 4, }
  const hasRunCleanSweep = useRef(false)

  const searchParams = useSearchParams()
  const recentId = searchParams.get("recent")
  const eventRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
        setRecentByPlayer({})
        setNextByPlayer({})
        setGamesCountByPlayer({})
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
          created_by,
          draft_status,
          curling_events ( id, name, year, location )
        `)
        .in("id", eventIds)

      const current = events?.filter(e => e.draft_status === "closed" || e.draft_status === "locked") ?? []
      const completed = events?.filter(e => e.draft_status === "completed") ?? []
      const eligible = events?.filter(e => e.draft_status === "locked" || e.draft_status === "completed") ?? []

      setClosedEvents(current)
      setCompletedLeagues(completed)
      setEligibleForStats(eligible)

      const picksByEvent: AnyMap<any[]> = {}
      for (const p of picks ?? []) {
        if (!picksByEvent[p.fantasy_event_id]) picksByEvent[p.fantasy_event_id] = []
        picksByEvent[p.fantasy_event_id].push(p)
      }
      setUserPicksByEvent(picksByEvent)

      const playerIds = Array.from(new Set((picks ?? []).map(p => p.player_id)))
      if (playerIds.length === 0) {
        setRecentByPlayer({})
        setNextByPlayer({})
        setGamesCountByPlayer({})
        setLoading(false)
        return
      }

      const { data: drawRows } = await supabase
        .from("draws")
        .select(`
          player_id,
          indv_pct,
          team_pct,
          won,
          score_diff,
          fantasy_pts,
          games (
            id,
            game_datetime,
            team1_id,
            team2_id,
            team1:teams!games_team1_id_fkey ( team_name ),
            team2:teams!games_team2_id_fkey ( team_name )
          )
        `)
        .in("player_id", playerIds)

      const nowMs = Date.now()

      function getGameTimeMsFromDrawRow(row: any): number {
        const gamesArr = Array.isArray(row.games) ? row.games : row.games ? [row.games] : []
        let best = -1
        for (const g of gamesArr) {
          const dt = g?.game_datetime
          if (!dt) continue
          const ms = new Date(dt).getTime()
          if (ms > best) best = ms
        }
        return best
      }

      const recentMap: Record<string, any> = {}
      const gamesCountMap: Record<string, number> = {}

      for (const row of drawRows ?? []) {
        const pid = String(row.player_id)

        const rowTimeMs = getGameTimeMsFromDrawRow(row)
        if (rowTimeMs === -1) continue
        if (rowTimeMs > nowMs) continue

        gamesCountMap[pid] = (gamesCountMap[pid] ?? 0) + 1

        const existing = recentMap[pid]
        if (!existing || rowTimeMs > getGameTimeMsFromDrawRow(existing)) {
          recentMap[pid] = row
        }
      }

      setRecentByPlayer(recentMap)
      setGamesCountByPlayer(gamesCountMap)

      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

      const { data: nextGames } = await supabase
        .from("games")
        .select(`
          id,
          game_datetime,
          team1_id,
          team2_id,
          team1:teams!games_team1_id_fkey ( team_name ),
          team2:teams!games_team2_id_fkey ( team_name )
        `)
        .gt("game_datetime", threeHoursAgo)
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

        const nextGame = (nextGames ?? []).find(g => g.team1_id === teamId || g.team2_id === teamId)
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

  useEffect(() => {
    if (loading) return
    if (!recentId) return

    const el = eventRefs.current[String(recentId)]
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [loading, recentId])

  return (
    <>
      <div className="w-full px-3 sm:px-6 py-6 sm:py-10 flex flex-col items-center gap-6 sm:gap-10">
        {loading && (
          <p className="w-full flex justify-center mt-10 sm:mt-20 text-gray-600">
            Loading...
          </p>
        )}

        {!loading && completedLeagues.length > 0 && (
          <main className="w-full max-w-screen-xl bg-white shadow-md p-4 sm:p-8 rounded-lg">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
              Completed Fantasy Leagues
            </h1>

            <div className="space-y-10">
              {completedLeagues.map((league: any) => {
                const picks = userPicksByEvent[league.id] ?? []
                const isCommissioner = league.created_by === user?.id

                return (
                  <div key={league.id} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className="text-xl sm:text-2xl font-semibold hover:underline cursor-pointer break-words"
                              onClick={() => router.push(`/league/${league.slug}`)}
                            >
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

                            {isCommissioner && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                draw master
                              </span>
                            )}

                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                              completed
                            </span>
                          </div>

                          {league.curling_events && (
                            <p className="text-gray-700 text-sm sm:text-base break-words">
                              {league.curling_events.year} {league.curling_events.name} in{" "}
                              {league.curling_events.location}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="sm:self-start">
                        <button
                          onClick={() => router.push(`/league/${league.slug}`)}
                          className="w-full sm:w-auto bg-green-600 text-white px-4 sm:px-6 py-2 rounded-md hover:bg-green-700 transition"
                        >
                          View Results
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg">
                      <table className="min-w-[760px] w-full border-collapse text-xs sm:text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="py-2 px-2 sm:px-3 text-left">Position</th>
                            <th className="py-2 px-2 sm:px-3 text-left">Name</th>
                            <th className="py-2 px-2 sm:px-3 text-left">Team</th>
                            <th className="py-2 px-2 sm:px-3 text-left bg-blue-200">Recent Draw</th>
                            <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">Indv %</th>
                            <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">W/L</th>
                            <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">Score Diff</th>
                            <th className="py-2 px-2 sm:px-3 text-left bg-blue-200">Fantasy Pts</th>
                            <th className="py-2 px-2 sm:px-3 text-center">Games Played</th>
                            <th className="py-2 px-2 sm:px-3 text-center">Total Fantasy Pts</th>
                          </tr>
                        </thead>

                        <tbody>
                          {[...picks]
                            .sort((a, b) => {
                              const aOrder = player_pos_order[a.players.position] ?? 99
                              const bOrder = player_pos_order[b.players.position] ?? 99
                              return aOrder - bOrder
                            })
                            .map((p: any, idx: number) => {
                              const player = p.players
                              if (!player) return null

                              const team = player.teams
                              const recent = recentByPlayer[p.player_id]

                              return (
                                <tr
                                  key={player.id}
                                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                >
                                  <td className="py-2 px-2 sm:px-3">{player.position ?? "N/A"}</td>

                                  <td className="py-2 px-2 sm:px-3 font-medium">
                                    {player.first_name} {player.last_name}
                                  </td>

                                  <td className="py-2 px-2 sm:px-3">{team?.team_name ?? "N/A"}</td>

                                  <td
                                    className={`py-2 px-2 sm:px-3 ${
                                      idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                    }`}
                                  >
                                    {(() => {
                                      const g = recent ? getLatestGame(recent) : null
                                      if (!g) return <div className="text-gray-500">N/A</div>

                                      const opponent =
                                        g.team1_id === team?.id
                                          ? g.team2?.team_name
                                          : g.team1?.team_name

                                      return (
                                        <>
                                          <div className="font-small">{toET(g.game_datetime)}</div>
                                          <div className="text-gray-600 text-xs">
                                            vs {opponent ?? "N/A"}
                                          </div>
                                        </>
                                      )
                                    })()}
                                  </td>

                                  <td
                                    className={`py-2 px-2 sm:px-3 text-center ${
                                      idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                    }`}
                                  >
                                    {recent?.indv_pct ?? "N/A"}
                                  </td>

                                  <td
                                    className={`py-2 px-2 sm:px-3 text-center ${
                                      idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                    }`}
                                  >
                                    {recent ? (recent.won ? "W" : "L") : "N/A"}
                                  </td>

                                  <td
                                    className={`py-2 px-2 sm:px-3 text-center ${
                                      idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                    }`}
                                  >
                                    {recent?.score_diff ?? "N/A"}
                                  </td>

                                  <td
                                    className={`py-2 px-2 sm:px-3 text-center ${
                                      idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                    }`}
                                  >
                                    {recent?.fantasy_pts ?? "N/A"}
                                  </td>

                                  <td className="py-2 px-2 sm:px-3 text-center">
                                    {gamesCountByPlayer[p.player_id] ?? 0}
                                  </td>

                                  <td className="py-2 px-2 sm:px-3 text-center">
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

        {!loading && (closedEvents.length > 0 || completedLeagues.length === 0) && (
          <main className="w-full max-w-screen-xl bg-white shadow-md p-4 sm:p-8 rounded-lg">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Current Rinks</h1>

            {closedEvents.length === 0 && completedLeagues.length === 0 && (
              <p className="text-gray-600">No current rinks.</p>
            )}

            {closedEvents.length > 0 && (
              <div className="space-y-10">
                {closedEvents.map((ev: any) => {
                  const picks = userPicksByEvent[ev.id] ?? []
                  const totalPoints = pointsByEvent[ev.id] ?? 0
                  const rank = ranksByEvent[ev.id] ?? "-"
                  const isCommissioner = ev.created_by === user?.id
                  const isRecent = recentId && String(ev.id) === String(recentId)

                  return (
                    <div
                      key={ev.id}
                      ref={(el) => {
                        eventRefs.current[String(ev.id)] = el
                      }}
                      className={`space-y-4 rounded-lg scroll-mt-24 ${
                        isRecent
                          ? "ring-2 ring-green-300/60 shadow-[0_0_0.75rem_rgba(34,197,94,0.55)] p-4"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className="text-xl sm:text-2xl font-semibold hover:underline cursor-pointer break-words"
                              onClick={() => router.push(`/league/${ev.slug}`)}
                            >
                              {ev.name}
                            </h2>

                            {ev.is_public ? (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                public
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                                private
                              </span>
                            )}

                            {isCommissioner && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                draw master
                              </span>
                            )}
                          </div>

                          <div className="text-gray-700 text-sm sm:text-base break-words">
                            {ev.curling_events?.year ?? ""}{" "}
                            {ev.curling_events?.name ?? "Unknown Event"} in{" "}
                            {ev.curling_events?.location ?? "Unknown Location"}
                          </div>
                        </div>

                        <div className="w-full sm:w-auto">
                          <div className="p-3 sm:p-0 sm:border-0 sm:bg-transparent">
                            <div className="grid grid-cols-2 gap-3 sm:gap-6">
                              <div className="flex flex-col items-center">
                                <div className="text-gray-500 text-sm">Total Points</div>
                                <div className="text-xl font-bold">{totalPoints}</div>
                              </div>

                              <div className="flex flex-col items-center">
                                <div className="text-gray-500 text-sm">Rank</div>
                                <div className="text-xl font-bold">{rank}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg">
                        <table className="min-w-[1040px] w-full border-collapse text-xs sm:text-sm">
                          <thead className="bg-gray-100 text-gray-700">
                            <tr>
                              <th className="py-2 px-2 sm:px-3 text-left">Position</th>
                              <th className="py-2 px-2 sm:px-3 text-left">Name</th>
                              <th className="py-2 px-2 sm:px-3 text-left">Team</th>
                              <th className="py-2 px-2 sm:px-3 text-left bg-blue-200">Recent Draw</th>
                              <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">Indv %</th>
                              <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">W/L</th>
                              <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">Score Diff</th>
                              <th className="py-2 px-2 sm:px-3 text-center bg-blue-200">Fantasy Pts</th>
                              <th className="py-2 px-2 sm:px-3 text-left">Next Draw</th>
                              <th className="py-2 px-2 sm:px-3 text-center">Games Played</th>
                              <th className="py-2 px-2 sm:px-3 text-center">Total Fantasy Pts</th>
                            </tr>
                          </thead>

                          <tbody>
                            {[...picks]
                              .sort((a, b) => {
                                const aOrder = player_pos_order[a.players.position] ?? 99
                                const bOrder = player_pos_order[b.players.position] ?? 99
                                return aOrder - bOrder
                              })
                              .map((p: any, idx: number) => {
                                const player = p.players
                                if (!player) return null

                                const team = player.teams
                                const teamId = team?.id
                                const recent = recentByPlayer[p.player_id]
                                const next = nextByPlayer[p.player_id]

                                let nextOpponent = "N/A"
                                if (next) {
                                  const isTeam1 = next.team1_id === teamId
                                  nextOpponent = isTeam1 ? next.team2?.team_name : next.team1?.team_name
                                }

                                return (
                                  <tr
                                    key={player.id}
                                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                  >
                                    <td className="py-2 px-2 sm:px-3">{player.position ?? "N/A"}</td>

                                    <td className="py-2 px-2 sm:px-3 font-medium">
                                      {player.first_name} {player.last_name}
                                    </td>

                                    <td className="py-2 px-2 sm:px-3">{team?.team_name ?? "N/A"}</td>

                                    <td
                                      className={`py-2 px-2 sm:px-3 ${
                                        idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                      }`}
                                    >
                                      {(() => {
                                        const g = recent ? getLatestGame(recent) : null
                                        if (!g) return <div className="text-gray-500">N/A</div>

                                        const opponent =
                                          g.team1_id === teamId
                                            ? g.team2?.team_name
                                            : g.team1?.team_name

                                        return (
                                          <>
                                            <div className="font-small">{toET(g.game_datetime)}</div>
                                            <div className="text-gray-600 text-xs">
                                              vs {opponent ?? "N/A"}
                                            </div>
                                          </>
                                        )
                                      })()}
                                    </td>

                                    <td
                                      className={`py-2 px-2 sm:px-3 text-center ${
                                        idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                      }`}
                                    >
                                      {recent?.indv_pct ?? "N/A"}
                                    </td>

                                    <td
                                      className={`py-2 px-2 sm:px-3 text-center ${
                                        idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                      }`}
                                    >
                                      {recent ? (recent.won ? "W" : "L") : "N/A"}
                                    </td>

                                    <td
                                      className={`py-2 px-2 sm:px-3 text-center ${
                                        idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                      }`}
                                    >
                                      {recent?.score_diff ?? "N/A"}
                                    </td>

                                    <td
                                      className={`py-2 px-2 sm:px-3 text-center ${
                                        idx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                                      }`}
                                    >
                                      {recent?.fantasy_pts ?? "N/A"}
                                    </td>

                                    <td className="py-2 px-2 sm:px-3">
                                      {next ? (
                                        <>
                                          <div className="font-medium">{toET(next.game_datetime)}</div>
                                          <div className="text-gray-600 text-xs">vs {nextOpponent}</div>
                                        </>
                                      ) : (
                                        <div className="text-gray-500">N/A</div>
                                      )}
                                    </td>

                                    <td className="py-2 px-2 sm:px-3 text-center">
                                      {gamesCountByPlayer[p.player_id] ?? 0}
                                    </td>

                                    <td className="py-2 px-2 sm:px-3 text-center">
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
            )}
          </main>
        )}
      </div>

      {achievementModal && (
        <AchievementModal
          open={true}
          onClose={() => setAchievementModal(null)}
          title={achievementFromDB?.name ?? ""}
          description={achievementFromDB?.description ?? ""}
          iconSrc={achievementModal ? getAchievementIcon(achievementModal) : null}
        />
      )}
    </>
  )
}
