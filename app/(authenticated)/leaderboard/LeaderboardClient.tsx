"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

type League = {
  id: string
  name: string
  slug: string
  description: string | null
  draft_status: string
  is_public: boolean
  curling_events?: any | null
  members: string[]
  is_commissioner: boolean
}

type LeaderboardRow = {
  user_id: string
  rank: number
  total_points: number
  profile: {
    id: string
    username: string
    first_name: string
    last_name: string
    avatar_url: string
    is_public: boolean
  }
}

export default function LeagueLeaderboardPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const [leagues, setLeagues] = useState<League[]>([])
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardRow[]>>({})
  const [events, setEvents] = useState<any[]>([])
  const [topCurlers, setTopCurlers] = useState<Record<string, Record<string, any[]>>>({})

  const positions = ["Lead", "Second", "Vice Skip", "Skip"]
  const [activeTab, setActiveTab] = useState<"current" | "top" | "past">("current")

  const [filterEvent, setFilterEvent] = useState("ALL")
  const [filterPosition, setFilterPosition] = useState("ALL")
  const [filterLeagueScope, setFilterLeagueScope] = useState<"ALL" | "MINE">("ALL")

 useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const res = await fetch("/api/check-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await res.json()

      if (!data.allowed) {
        router.push("/login")
        return
      }

      setUserId(user.id)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!userId) return
    loadCurrentLeagues()
  }, [userId])

  async function loadCurrentLeagues() {
    setLoading(true)

    const { data: leagueRows } = await supabase
      .from("fantasy_events")
      .select(`
        id,
        name,
        slug,
        description,
        draft_status,
        created_by,
        is_public,
        curling_events:curling_events!fantasy_events_curling_event_id_fkey (*)
      `)
      .in("draft_status", ["locked", "completed"])
      .order("draft_date", { ascending: false })

    const normalized: League[] = (leagueRows ?? []).map(l => ({
      ...l,
      curling_events: Array.isArray(l.curling_events)
        ? l.curling_events[0] ?? null
        : l.curling_events ?? null,
      members: [],
      is_commissioner: l.created_by === userId
    }))

    const leagueIds = normalized.map(l => l.id)

    const { data: memberRows } = await supabase
      .from("fantasy_event_users")
      .select("fantasy_event_id, user_id")
      .in("fantasy_event_id", leagueIds)

    const membersByLeague: Record<string, string[]> = {}

    for (const row of memberRows ?? []) {
      if (!membersByLeague[row.fantasy_event_id]) {
        membersByLeague[row.fantasy_event_id] = []
      }
      membersByLeague[row.fantasy_event_id].push(row.user_id)
    }

    const leaguesWithMembers = normalized.map(league => ({
      ...league,
      members: membersByLeague[league.id] ?? []
    }))

    const visibleLeagues = leaguesWithMembers.filter(league =>
      league.is_public || league.members.includes(userId)
    )

    setLeagues(visibleLeagues)

    const results: Record<string, LeaderboardRow[]> = {}

    for (const league of visibleLeagues) {
      const { data: totals } = await supabase.rpc("get_league_totals_by_event", {
        event_id: league.id
      })

      if (!totals) continue

      const userIds = totals.map((t: any) => t.user_id)

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url, is_public")
        .in("id", userIds)

      const profileMap = Object.fromEntries(
        (profiles ?? []).map(p => [p.id, p])
      )

      results[league.id] = totals
      .map((t: any): LeaderboardRow => ({
        user_id: t.user_id,
        total_points: t.total_points,
        rank: t.rank,
        profile: profileMap[t.user_id]
      }))
      .sort((a: LeaderboardRow, b: LeaderboardRow) => b.total_points - a.total_points)
    }

    setLeaderboards(results)
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === "top") loadTopCurlers()
  }, [activeTab])

  async function loadTopCurlers() {
    setLoading(true)

    const { data: eventRows } = await supabase
      .from("curling_events")
      .select("*")
      .order("start_date", { ascending: true })

    const results: Record<string, Record<string, any[]>> = {}

    for (const event of eventRows ?? []) {
      results[event.id] = {}

      for (const pos of positions) {
        const { data: rows } = await supabase.rpc(
          "get_top_curlers_by_event_and_position",
          { event_id: event.id, pos }
        )

        results[event.id][pos] = rows ?? []
      }
    }

    setTopCurlers(results)
    setEvents(eventRows ?? [])
    setLoading(false)
  }

  return (
    <>
      <div className="w-full px-3 sm:px-6 py-6 sm:py-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Leaderboards</h1>

          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex justify-center sm:justify-start flex-1 overflow-x-auto">
                <div className="inline-flex gap-2 sm:gap-3 whitespace-nowrap">
                  {[
                    { key: "current", label: "Current Leagues" },
                    { key: "top", label: "Top Curlers" },
                    { key: "past", label: "Past Events" }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base transition ${
                        activeTab === tab.key
                          ? "bg-[#1f4785] text-white"
                          : "text-[#1f4785]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center sm:justify-end items-center gap-3 text-gray-700 shrink-0">
                <div className="hidden sm:block h-6 w-px" />
                <span
                  className={`text-sm sm:text-sm whitespace-nowrap ${
                    activeTab === "top" ? "hidden sm:inline" : ""
                  }`}
                >
                  Filter By:
                </span>

                {activeTab === "current" && (
                  <div className="relative">
                    <select
                      value={filterLeagueScope}
                      onChange={e =>
                        setFilterLeagueScope(e.target.value as "ALL" | "MINE")
                      }
                      className="px-4 py-2 sm:px-4 sm:py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                    >
                      <option value="ALL">All Leagues</option>
                      <option value="MINE">My Leagues</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ⌵
                    </div>
                  </div>
                )}

                {activeTab === "top" && (
                  <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-3">
                    {/* Mobile row 1: "Filter by:" + Event */}
                    <div className="flex items-center gap-2 sm:hidden">
                      <span className="text-sm whitespace-nowrap text-gray-700">Filter by:</span>

                      <div className="relative">
                        <select
                          value={filterEvent}
                          onChange={e => setFilterEvent(e.target.value)}
                          className="px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                        >
                          <option value="ALL">Event</option>
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>
                              {ev.year} {ev.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          ⌵
                        </div>
                      </div>
                    </div>

                    {/* Desktop Event */}
                    <div className="relative hidden sm:block">
                      <select
                        value={filterEvent}
                        onChange={e => setFilterEvent(e.target.value)}
                        className="px-4 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                      >
                        <option value="ALL">Event</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.year} {ev.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ⌵
                      </div>
                    </div>

                    {/* Position*/}
                    <div className="relative sm:block">
                      <select
                        value={filterPosition}
                        onChange={e => setFilterPosition(e.target.value)}
                        className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                      >
                        <option value="ALL">Position</option>
                        {positions.map(pos => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ⌵
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeTab === "current" && (
            <>
              {loading && (
                <p className="w-full flex justify-center mt-20 text-gray-600">
                  Loading...
                </p>
              )}

              {!loading && (
                <>
                  {(() => {
                    const filtered = leagues.filter(league => {
                      if (filterLeagueScope === "ALL") return true
                      if (filterLeagueScope === "MINE") {
                        if (!userId) return false
                        return league.members?.includes(userId)
                      }
                      return true
                    })

                    const completed = filtered.filter(l => l.draft_status === "completed")
                    const active = filtered.filter(l => l.draft_status !== "completed")

                    return (
                      <div className="space-y-6">
                        {completed.length > 0 && (
                          <>
                            <h2 className="text-xl sm:text-2xl font-bold mt-2">
                              Completed Leagues
                            </h2>

                            <div className="space-y-4">
                              {completed.map(league => (
                                <div
                                  key={league.id}
                                  className="bg-white shadow-md p-4 sm:p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h3
                                        className="text-lg sm:text-2xl font-semibold hover:underline cursor-pointer break-words"
                                        onClick={() => router.push(`/league/${league.slug}`)}
                                      >
                                        {league.name}
                                      </h3>

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
                                      <p className="text-gray-700 text-sm break-words">
                                        {league.curling_events.year} {league.curling_events.name} in{" "}
                                        {league.curling_events.location}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => router.push(`/league/${league.slug}`)}
                                    className="w-full sm:w-auto bg-green-600 text-white px-4 sm:px-6 py-2 rounded-md hover:bg-green-700 transition"
                                  >
                                    View Results
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {active.length > 0 && (
                          <>
                            <h2 className="text-xl sm:text-2xl font-bold">
                              Active Leagues
                            </h2>

                            <div className="space-y-6">
                              {active.map(league => (
                                <div
                                  key={league.id}
                                  className="bg-white shadow-md p-4 sm:p-6 rounded-lg"
                                >
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h2
                                      className="text-lg sm:text-2xl font-semibold hover:underline cursor-pointer break-words"
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

                                    {league.is_commissioner && (
                                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                        draw master
                                      </span>
                                    )}
                                  </div>

                                  {league.curling_events && (
                                    <div className="text-gray-700 mb-4 text-sm break-words">
                                      {league.curling_events.year} {league.curling_events.name} in{" "}
                                      {league.curling_events.location}
                                    </div>
                                  )}

                                  <div className="overflow-x-auto rounded-lg">
                                    <table className="w-full border-collapse table-fixed sm:table-auto text-xs sm:text-sm">
                                      <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                          <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[34px] sm:w-auto">Rank</th>
                                          <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[44px] sm:w-auto"></th>
                                          <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[140px] sm:w-auto">Username</th>
                                          <th className="py-1 px-1 sm:py-2 sm:px-3 w-[72px] sm:w-auto">
                                            <div className="flex justify-center whitespace-nowrap">Total Points</div>
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody>
                                        {leaderboards[league.id]?.map((row, idx) => {
                                          const profile = row.profile
                                          return (
                                            <tr key={row.user_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                              <td className="py-1 px-1 sm:py-2 sm:px-3 font-medium tabular-nums w-[34px] sm:w-auto">
                                                {row.rank}
                                              </td>

                                              <td className="py-1 px-1 sm:py-2 sm:px-3 w-[44px] sm:w-auto">
                                                {profile?.avatar_url ? (
                                                  <Image
                                                    src={profile.avatar_url}
                                                    alt={`${profile.username} avatar`}
                                                    width={32}
                                                    height={32}
                                                    className="rounded-full object-cover border border-gray-300 w-7 h-7 sm:w-8 sm:h-8"
                                                  />
                                                ) : (
                                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-300 flex items-center justify-center text-[11px] sm:text-xs text-gray-600">
                                                    {profile?.username?.charAt(0)?.toUpperCase() ?? "?"}
                                                  </div>
                                                )}
                                              </td>

                                              <td className="py-1 px-1 sm:py-2 sm:px-3 font-medium w-[140px] sm:w-auto">
                                                <div className="truncate">
                                                  {profile?.is_public ? (
                                                    <Link href={`/profile/${profile.username}`} className="text-blue-600 hover:underline">
                                                      {profile.username}
                                                    </Link>
                                                  ) : (
                                                    <span className="text-gray-500">{profile.username}</span>
                                                  )}
                                                </div>
                                              </td>

                                              <td className="py-1 px-1 sm:py-2 sm:px-3 w-[72px] sm:w-auto">
                                                <div className="flex justify-center tabular-nums font-semibold">
                                                  {row.total_points}
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {completed.length === 0 && active.length === 0 && (
                          <p className="text-gray-600">No current leagues.</p>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </>
          )}

          {activeTab === "top" && (
            <>
              {!loading && leagues.length === 0 && (
                <p className="text-gray-600">No current curlers.</p>
              )}

              {events
                .filter(ev => filterEvent === "ALL" || ev.id === filterEvent)
                .map(event =>
                  positions
                    .filter(pos => filterPosition === "ALL" || pos === filterPosition)
                    .map(position => {
                      const leaderboard = topCurlers[event.id]?.[position] ?? []
                      const isCompleted = new Date(event.round_robin_end_date) < new Date()
                      const isNotStarted = new Date(event.start_date) > new Date()

                      return (
                        <div
                          key={`${event.id}-${position}`}
                          className="bg-white shadow-md p-4 sm:p-6 mb-6 rounded-lg"
                        >
                          <h2 className="text-lg sm:text-xl font-semibold mb-1 flex items-center gap-2">
                            <span>{position}s</span>

                            {isNotStarted && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">
                                event not started
                              </span>
                            )}

                            {isCompleted && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                                round robin complete
                              </span>
                            )}
                          </h2>

                          <div className="text-gray-700 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="font-medium break-words">
                              {event.year} {event.name} at {event.location}
                            </div>

                            <div className="text-sm text-gray-600">
                              {new Date(event.start_date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric"
                              })}{" "}
                              –{" "}
                              {new Date(event.end_date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric"
                              })}
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-lg">
                            <table className="w-full border-collapse table-fixed sm:table-auto text-xs sm:text-sm">
                              <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                  <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[40px] sm:w-auto">
                                    Rank
                                  </th>
                                  <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[150px] sm:w-auto">
                                    Name
                                  </th>
                                  <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[140px] sm:w-auto">
                                    Team
                                  </th>
                                  <th className="py-1 px-1 sm:py-2 sm:px-3 w-[90px] sm:w-auto">
                                    <div className="flex justify-center whitespace-nowrap">Total Points</div>
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {leaderboard.map((row: any, idx: number) => (
                                  <tr
                                    key={row.curler_id}
                                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                  >
                                    <td className="py-1 px-1 sm:py-2 sm:px-3 font-medium tabular-nums w-[40px] sm:w-auto">
                                      {idx + 1}
                                    </td>

                                    <td className="py-1 px-1 sm:py-2 sm:px-3 font-medium w-[150px] sm:w-auto">
                                      <div className="truncate">
                                        {row.first_name} {row.last_name}
                                      </div>
                                    </td>

                                    <td className="py-1 px-1 sm:py-2 sm:px-3 w-[140px] sm:w-auto">
                                      <div className="truncate">{row.team_name}</div>
                                    </td>

                                    <td className="py-1 px-1 sm:py-2 sm:px-3 w-[90px] sm:w-auto">
                                      <div className="flex justify-center tabular-nums font-semibold">
                                        {row.total_points}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })
                )}
            </>
          )}

          {activeTab === "past" && (
            <>
              {loading && (
                <p className="w-full flex justify-center mt-20 text-gray-600">
                  Loading...
                </p>
              )}

              {!loading && leagues.length === 0 && (
                <p className="text-gray-600">No past events.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}