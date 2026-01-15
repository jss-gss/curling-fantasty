"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
import Link from "next/link"
import LoggedInNavBar from "@/components/LoggedInNavBar"

type League = {
  id: string
  name: string
  description: string | null
  draft_status: string 
  is_public: boolean
  curling_events?: {
    id: string
    name: string
    year: number
    location: string
    start_date: string
    end_date: string
    link: string | null
    round_robin_end_date: string
  } | null
  members: string[]
  is_commissioner: boolean
}

type LeaderboardRow = {
  user_id: string
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
  const [leagues, setLeagues] = useState<League[]>([])
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardRow[]>>({})
  const [activeTab, setActiveTab] = useState<"current" | "top" | "past">("current")
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [topCurlers, setTopCurlers] = useState<Record<string, Record<string, any[]>>>({})
  const positions = ["Lead", "Second", "Vice Skip", "Skip"]
  const [filterEvent, setFilterEvent] = useState("ALL")
  const [filterPosition, setFilterPosition] = useState("ALL")
  const [filterLeagueScope, setFilterLeagueScope] = useState<"ALL" | "MINE">("ALL")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (userId === null) return
    loadCurrentLeagues()
  }, [userId])

  async function loadCurrentLeagues() {
    setLoading(true)

    const { data: leagueRows } = await supabase
      .from("fantasy_events")
      .select(`
        id,
        name,
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
      is_commissioner: userId ? l.created_by === userId : false
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

    const leaguesWithMembers: League[] = normalized.map(league => ({
      ...league,
      members: membersByLeague[league.id] ?? []
    }))

    const visibleLeagues = leaguesWithMembers.filter(league => {
      if (league.is_public) return true
      if (!userId) return false
      return league.members.includes(userId)
    })

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

      const rows: LeaderboardRow[] = totals
        .map((t: any) => ({
          user_id: t.user_id,
          total_points: t.total_points,
          profile: profileMap[t.user_id]
        }))
        .sort((a: LeaderboardRow, b: LeaderboardRow) => b.total_points - a.total_points)

      results[league.id] = rows
    }

    setLeaderboards(results)
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === "top") {
      loadTopCurlers()
    }
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
          {
            event_id: event.id,
            pos: pos
          }
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
      <LoggedInNavBar />

      <div className="pt-16 max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Leaderboards</h1>

        <div className="flex items-center justify-between mb-8">
        {/* LEFT: Tabs */}
        <div className="flex gap-4">
          {[
            { key: "current", label: "Current Leagues" },
            { key: "top", label: "Top Curlers" },
            { key: "past", label: "Past Event Results" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 ${
                activeTab === tab.key
                  ? "bg-[#1f4785] text-white border-blue-600 rounded-md"
                  : "bg-gray-100 text-gray-700 border-gray-300 rounded-md"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* RIGHT: Filters (only visible on TOP tab) */}
        {activeTab === "top" && (
          <div className="flex items-center gap-4 text-gray-700">

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300" />

            <span className="font-medium">Filter By:</span>

            {/* Event Filter */}
            <div className="relative">
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 font-medium appearance-none pr-8 rounded-md"
              >
                <option value="ALL">Event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.year} {ev.name}
                  </option>
                ))}
              </select>

              {/* Custom arrow */}
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                ⌵
              </div>
            </div>

            {/* Position Filter */}
            <div className="relative">
              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 font-medium appearance-none pr-8 rounded-md"
              >
                <option value="ALL">Position</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>

              {/* Custom arrow */}
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                ⌵
              </div>
            </div>
          </div>
        )}

        {activeTab == "current" && (
          <div className="flex items-center gap-4 text-gray-700">
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300" />

            <span className="font-medium">Filter By:</span>

            {/* League Scope Filter */}
            <div className="relative">
              <select
                value={filterLeagueScope}
                onChange={(e) => setFilterLeagueScope(e.target.value as "ALL" | "MINE")}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 font-medium appearance-none pr-8 rounded-md"
              >
                <option value="ALL">All Leagues</option>
                <option value="MINE">My Leagues</option>
              </select>

              {/* Custom arrow (optional) */}
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 rounded-md">
                ⌵
              </div>
            </div>
          </div>
        )}

      </div>
        {activeTab === "current" && (
          <>
            {loading && <p>Loading...</p>}

            {!loading && (
              <>
                {/* FILTER LEAGUES */}
                {(() => {
                  const filtered = leagues.filter((league) => {
                    if (filterLeagueScope === "ALL") return true
                    if (filterLeagueScope === "MINE") {
                      if (!userId) return false
                      return league.members?.includes(userId)
                    }
                    return true
                  })

                  const completed = filtered.filter(
                    (l) => l.draft_status === "completed"
                  )

                  const active = filtered.filter(
                    (l) => l.draft_status !== "completed"
                  )

                  return (
                    <div className="space-y-4">

                      {/* COMPLETED LEAGUES */}
                      {completed.length > 0 && (
                        <>
                          <h2 className="text-2xl font-bold mb-3 mt-6">Completed Leagues</h2>

                          <div className="space-y-6 mb-10">
                            {completed.map((league) => (
                              <div
                                key={league.id}
                                className="bg-white shadow-md p-6 rounded-lg border border-gray-200 flex items-center justify-between"
                              >
                                <div>
                                  {/* HEADER WITH BADGES */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-xl font-semibold">{league.name}</h3>

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
                                        commissioner
                                      </span>
                                    )}

                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                                      completed
                                    </span>
                                  </div>

                                  {/* EVENT INFO */}
                                  {league.curling_events && (
                                    <p className="text-gray-700 flex items-center justify-between">
                                      {league.curling_events.year} {league.curling_events.name} in{" "}
                                      {league.curling_events.location}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={() => alert("Results page coming soon!")}
                                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
                                >
                                  View Results
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* ACTIVE LEAGUES */}
                      {active.length > 0 && (
                        <>
                          <h2 className="text-2xl font-bold mb-3 mt-6">Active Leagues</h2>

                          <div className="space-y-10">
                            {active.map((league) => (
                              <div
                                key={league.id}
                                className="bg-white shadow-md p-6 rounded-lg"
                              >
                                {/* HEADER */}
                                <div className="flex items-center gap-2 mb-2">
                                  <h2 className="text-xl font-semibold">{league.name}</h2>

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
                                      commissioner
                                    </span>
                                  )}
                                </div>

                                {/* EVENT INFO */}
                                {league.curling_events && (
                                  <div className="text-gray-700 mb-4 flex items-center justify-between">
                                      {league.curling_events.year}{" "}
                                      {league.curling_events.name} in{" "}
                                      {league.curling_events.location}
                                  </div>
                                )}

                                {/* LEADERBOARD TABLE */}
                                <div className="overflow-hidden rounded-lg">
                                  <table className="w-full border-collapse text-sm">
                                    <thead className="bg-gray-100 text-gray-700">
                                      <tr>
                                        <th className="py-2 px-3 text-left">Rank</th>
                                        <th className="py-2 px-3 text-left"></th>
                                        <th className="py-2 px-3 text-left">Username</th>
                                        <th className="py-2 px-3 text-left">Total Points</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {leaderboards[league.id]?.map((row, idx) => {
                                        const profile = row.profile

                                        return (
                                          <tr
                                            key={row.user_id}
                                            className={
                                              idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                            }
                                          >
                                            <td className="py-2 px-3 font-medium">
                                              {idx + 1}
                                            </td>

                                            <td className="py-2 px-3">
                                              {profile?.avatar_url ? (
                                                <Image
                                                  src={profile.avatar_url}
                                                  alt={`${profile.username} avatar`}
                                                  width={32}
                                                  height={32}
                                                  className="rounded-full object-cover border border-gray-300"
                                                />
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                                  {profile?.username
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ?? "?"}
                                                </div>
                                              )}
                                            </td>

                                            <td className="py-2 px-3 font-medium">
                                              {profile?.is_public ? (
                                                <Link
                                                  href={`/profile/${profile.username}`}
                                                  className="text-blue-600 hover:underline"
                                                >
                                                  {profile.username}
                                                </Link>
                                              ) : (
                                                <span className="text-gray-500">
                                                  {profile.username}
                                                </span>
                                              )}
                                            </td>

                                            <td className="py-2 px-3 font-semibold">
                                              {row.total_points}
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

                      {/* NOTHING FOUND */}
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
            {loading && <p></p>}

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

                return (
                  <div
                    key={`${event.id}-${position}`}
                    className="bg-white shadow-md p-6 mb-8 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold mb-1">
                        {position}
                      </h2>
                        {isCompleted && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                            round robin complete
                          </span>
                        )}
                    </div>

                    <div className="text-gray-700 mb-4 flex items-center justify-between">
                      <div className="font-medium">
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
                    <div className="overflow-hidden rounded-lg">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="py-2 px-3 text-left">Rank</th>
                            <th className="py-2 px-3 text-left"></th>
                            <th className="py-2 px-3 text-left">Name</th>
                            <th className="py-2 px-3 text-left">Team</th>
                            <th className="py-2 px-3 text-left">Total Points</th>
                          </tr>
                        </thead>

                        <tbody>
                          {leaderboard.map((row, idx) => (
                            <tr
                              key={row.curler_id}
                              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                              <td className="py-2 px-3 font-medium">{idx + 1}</td>

                              <td className="py-2 px-3">
                                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                              </td>

                            <td className="py-2 px-3 font-medium">
                              {row.first_name} {row.last_name}
                            </td>

                              <td className="py-2 px-3">
                                {row.team_name}
                              </td>

                              <td className="py-2 px-3 font-semibold">
                                {row.total_points}
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
            {loading && <p>Loading...</p>}

            {!loading && leagues.length === 0 && (
              <p className="text-gray-600">No past events.</p>
            )}
          </>
        )}
      </div>
    </>
  )
}
