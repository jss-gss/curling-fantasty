"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type CurlingEvent = {
  id: string
  name: string | null
  year: number | null
  end_date: string | null
}

type ArchiveLeagueRow = {
  league_id: string
  league_name: string
  is_public: boolean
  created_by: string
  curling_event_id: string
  event_label: string
  points: number | null
  rank: number | null
  slug: string
  is_commissioner: boolean 
}

const EVENT_ALL = "ALL"

const ARCHIVED_STATUSES = ["archived"]

function todayStrLocal() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function labelEvent(ev: { year: number | null; name: string | null }) {
  const y = ev.year ?? 0
  const n = (ev.name ?? "").trim()
  return y ? `${y} ${n}`.trim() : n
}

function normalizeOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

function tokenize(q: string) {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

type RoleFilter = "ALL" | "DRAFT_MASTER"

export default function FantasyLeagueArchivesClient() {
  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<CurlingEvent[]>([])
  const [rows, setRows] = useState<ArchiveLeagueRow[]>([])

  const [selectedEventId, setSelectedEventId] = useState<string>(EVENT_ALL)
  const [search, setSearch] = useState<string>("")

  const [showPublic, setShowPublic] = useState(true)
  const [showPrivate, setShowPrivate] = useState(true)

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL")

  const anyFiltersApplied =
    selectedEventId !== EVENT_ALL ||
    !!search.trim() ||
    !showPublic ||
    !showPrivate ||
    roleFilter !== "ALL"

  function clearFilters() {
    setSelectedEventId(EVENT_ALL)
    setSearch("")
    setShowPublic(true)
    setShowPrivate(true)
    setRoleFilter("ALL")
  }

  useEffect(() => {
    void boot()
  }, [])

  async function boot() {
    setLoading(true)

    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser()
      if (authErr) throw authErr

      const userId = auth?.user?.id ?? ""
      if (!userId) {
        setEvents([])
        setRows([])
        setLoading(false)
        return
      }

      const today = todayStrLocal()
      const { data: evData, error: evErr } = await supabase
        .from("curling_events")
        .select("id,name,year,end_date")
        .lt("end_date", today)
        .order("end_date", { ascending: false })

      if (evErr) throw evErr

      const endedEvents = (evData ?? []) as CurlingEvent[]
      setEvents(endedEvents)

      const endedEventIds = endedEvents.map(e => e.id)

      const { data: memberships, error: memErr } = await supabase
        .from("fantasy_event_users")
        .select(
          `
          fantasy_event_id,
          points,
          rank,
          fantasy_events:fantasy_events (
            id,
            name,
            is_public,
            created_by,
            curling_event_id,
            draft_status,
            slug,
            curling_events:curling_events (
              id,
              name,
              year,
              end_date
            )
          )
        `
        )
        .eq("user_id", userId)
        .in("fantasy_events.draft_status", ARCHIVED_STATUSES)
        .in(
          "fantasy_events.curling_event_id",
          endedEventIds.length ? endedEventIds : ["00000000-0000-0000-0000-000000000000"]
        )
        .limit(2000)

      if (memErr) throw memErr

      const built: ArchiveLeagueRow[] = (memberships ?? [])
        .map((m: any) => {
          const league = m?.fantasy_events
          if (!league) return null

          const ev = normalizeOne(league.curling_events)

          return {
            league_id: String(league.id),
            league_name: (league.name ?? "").trim(),
            slug: String(league.slug ?? ""),
            is_public: !!league.is_public,
            created_by: String(league.created_by ?? ""),
            curling_event_id: String(league.curling_event_id ?? ""),
            event_label: labelEvent({ year: ev?.year ?? null, name: ev?.name ?? null }),
            points: m.points ?? null,
            rank: m.rank ?? null,
            is_commissioner: String(league.created_by ?? "") === userId,
          } as ArchiveLeagueRow
        })
        .filter(Boolean) as ArchiveLeagueRow[]

      built.sort((a, b) => b.event_label.localeCompare(a.event_label) || a.league_name.localeCompare(b.league_name))

      setRows(built)
      setLoading(false)
    } catch (e: any) {
      console.error("League Archives boot failed", {
        name: e?.name,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code,
        raw: e,
      })
      setEvents([])
      setRows([])
      setLoading(false)
    }
  }

  const eventOptions = useMemo(() => {
    return events.map(e => ({
      id: e.id,
      label: labelEvent({ year: e.year ?? null, name: e.name ?? null }),
    }))
  }, [events])

  const filteredRows = useMemo(() => {
    const toks = tokenize(search)

    return rows.filter(league => {
      if (selectedEventId !== EVENT_ALL && league.curling_event_id !== selectedEventId) return false

      if (!showPublic && league.is_public) return false
      if (!showPrivate && !league.is_public) return false

      if (roleFilter === "DRAFT_MASTER" && !league.is_commissioner) return false

      if (toks.length) {
        const name = (league.league_name ?? "").toLowerCase()
        if (!toks.every(t => name.includes(t))) return false
      }

      return true
    })
  }, [rows, selectedEventId, search, showPublic, showPrivate, roleFilter])

  const showingText = useMemo(() => {
    const n = filteredRows.length
    return loading ? "Loading leagues…" : `Showing ${n} league${n === 1 ? "" : "s"}`
  }, [filteredRows.length, loading])

  return (
    <div className="w-full px-3 sm:px-6 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">League Archives</h1>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-start">
            <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
                <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search league name..."
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md"
                disabled={loading}
                />
            </div>

            <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Event</label>
                <div className="relative">
                <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                    disabled={loading}
                >
                    <option value={EVENT_ALL}>All events</option>
                    {eventOptions.map(ev => (
                    <option key={ev.id} value={ev.id}>
                        {ev.label}
                    </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
                </div>
            </div>

            <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Filter</label>
                <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as RoleFilter)}
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md"
                disabled={loading}
                >
                <option value="ALL">All leagues</option>
                <option value="DRAFT_MASTER">Draw Master</option>
                </select>
            </div>

            <div className="sm:col-span-2 sm:mt-0">
                <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Visibility</label>
                {anyFiltersApplied ? (
                    <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-red-700 hover:text-red-900 whitespace-nowrap"
                    disabled={loading}
                    >
                    Clear
                    </button>
                ) : (
                    <span className="text-xs text-transparent select-none whitespace-nowrap">Clear</span>
                )}
                </div>

                <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                    type="checkbox"
                    checked={showPublic}
                    onChange={e => setShowPublic(e.target.checked)}
                    className="h-4 w-4 accent-green-600"
                    disabled={loading}
                    />
                    Public
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                    type="checkbox"
                    checked={showPrivate}
                    onChange={e => setShowPrivate(e.target.checked)}
                    className="h-4 w-4 accent-green-600"
                    disabled={loading}
                    />
                    Private
                </label>
                </div>
            </div>
            </div>
            <div className="rounded-lg overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse table-fixed sm:table-auto text-xs sm:text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[180px] sm:w-[240px]">League</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[180px] sm:w-[180px]">Event</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[80px] sm:w-[120px]"></th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[80px] sm:w-[120px]"></th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-right w-[60px] sm:w-[90px]">Points</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-right w-[60px] sm:w-[90px]">Rank</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-600">
                        Loading...
                      </td>
                    </tr>
                  )}

                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-600">
                        No results.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    filteredRows.map((league, idx) => (
                      <tr key={league.slug} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-2 px-2 sm:px-3 font-medium">
                          <Link
                            href={`/league/${league.slug}`}
                            className="truncate block text-blue-700 hover:text-blue-900 hover:underline"
                            title={league.league_name}
                          >
                            {league.league_name || "Untitled league"}
                          </Link>
                        </td>

                        <td className="py-2 px-2 sm:px-3">
                          <div className="truncate">{league.event_label}</div>
                        </td>

                        <td className="py-2 px-2 sm:px-3">
                          {league.is_public ? (
                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              public
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                              private
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-2 sm:px-3">
                          {league.is_commissioner ? (
                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                              draw master
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{league.points ?? "—"}</td>
                        <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{league.rank ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-600">{showingText}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
