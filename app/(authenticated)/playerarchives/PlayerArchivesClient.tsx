"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type CurlingEvent = {
  id: string
  name: string
  year: number
  end_date: string
}

type PlayerRow = {
  id: string
  first_name: string | null
  last_name: string | null
  position: string | null
  team_id: string | null
  teams:
    | {
        id: string
        team_name: string | null
        curling_event_id: string | null
        curling_events:
          | {
              id: string
              name: string | null
              year: number | null
              end_date: string | null
            }
          | {
              id: string
              name: string | null
              year: number | null
              end_date: string | null
            }[]
          | null
      }
    | {
        id: string
        team_name: string | null
        curling_event_id: string | null
        curling_events:
          | {
              id: string
              name: string | null
              year: number | null
              end_date: string | null
            }
          | {
              id: string
              name: string | null
              year: number | null
              end_date: string | null
            }[]
          | null
      }[]
    | null
}

type DrawRow = {
  player_id: string
  indv_pct: number | null
  won: boolean | null
  fantasy_pts: number | null
}

type ArchiveRow = {
  player_id: string
  first_name: string
  last_name: string
  position: string
  team_id: string
  team_name: string
  curling_event_id: string
  event_label: string

  games_played: number
  avg_indv_pct: number
  wins: number
  losses: number
  total_fantasy_pts: number

  rank: number
}

const POSITIONS = ["Lead", "Second", "Vice Skip", "Skip"] as const
const EVENT_ALL = "ALL"

function todayStrLocal() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function labelEvent(ev: { year: number | null; name: string | null }) {
  const y = ev.year ?? 0
  const n = ev.name ?? ""
  return y ? `${y} ${n}`.trim() : n.trim()
}

function normalizeOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

export default function PlayerArchivesClient() {
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)

  const [events, setEvents] = useState<CurlingEvent[]>([])
  const [rows, setRows] = useState<ArchiveRow[]>([])

  const [selectedEventId, setSelectedEventId] = useState<string>(EVENT_ALL)
  const [filterTeamId, setFilterTeamId] = useState<string>("ALL")
  const [filterPosition, setFilterPosition] = useState<string>("ALL")
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    void boot()
    async function boot() {
      setLoadingEvents(true)
      const today = todayStrLocal()

      const { data, error } = await supabase
        .from("curling_events")
        .select("id,name,year,end_date")
        .lt("end_date", today)
        .order("end_date", { ascending: false })

      if (error) {
        console.error(error)
        setEvents([])
        setRows([])
        setLoadingEvents(false)
        return
      }

      const evs = (data ?? []) as CurlingEvent[]
      setEvents(evs)
      setLoadingEvents(false)

      await loadAllEndedPlayers(evs)
    }
  }, [])

  async function loadAllEndedPlayers(evs: CurlingEvent[]) {
    if (!evs.length) {
      setRows([])
      return
    }

    setLoadingRows(true)
    setRows([])

    const endedEventIds = new Set(evs.map(e => e.id))

    const { data: playerData, error: playerErr } = await supabase
      .from("players")
      .select(
        `
        id,
        first_name,
        last_name,
        position,
        team_id,
        teams:teams (
          id,
          team_name,
          curling_event_id,
          curling_events:curling_events (
            id,
            name,
            year,
            end_date
          )
        )
      `
      )
      .limit(2000)

    if (playerErr) {
      console.error("players query failed", playerErr)
      setLoadingRows(false)
      return
    }

    const players = (playerData ?? []) as PlayerRow[]

    const endedPlayers = players.filter(p => {
      const team = normalizeOne(p.teams)
      const ev = normalizeOne(team?.curling_events ?? null)
      const evId = ev?.id ?? ""
      return !!evId && endedEventIds.has(evId)
    })

    const playerIds = endedPlayers.map(p => p.id)
    if (!playerIds.length) {
      setRows([])
      setLoadingRows(false)
      return
    }

    const { data: drawData, error: drawErr } = await supabase
      .from("draws")
      .select("player_id,indv_pct,won,fantasy_pts")
      .in("player_id", playerIds)

    if (drawErr) {
      console.error("draws query failed", drawErr)
      setLoadingRows(false)
      return
    }

    const draws = (drawData ?? []) as DrawRow[]

    const agg: Record<
      string,
      { games: number; pctSum: number; pctCount: number; wins: number; losses: number; fp: number }
    > = {}

    for (const d of draws) {
      const pid = d.player_id
      if (!agg[pid]) agg[pid] = { games: 0, pctSum: 0, pctCount: 0, wins: 0, losses: 0, fp: 0 }

      agg[pid].games += 1

      const pct = typeof d.indv_pct === "number" ? d.indv_pct : NaN
      if (Number.isFinite(pct)) {
        agg[pid].pctSum += pct
        agg[pid].pctCount += 1
      }

      const won = !!d.won
      agg[pid].wins += won ? 1 : 0
      agg[pid].losses += won ? 0 : 1

      agg[pid].fp += typeof d.fantasy_pts === "number" ? d.fantasy_pts : 0
    }

    const builtNoRank = endedPlayers
      .map(p => {
        const team = normalizeOne(p.teams)
        const ev = normalizeOne(team?.curling_events ?? null)
        const evId = ev?.id ?? ""
        const teamId = p.team_id ?? team?.id ?? ""
        if (!evId || !teamId) return null

        const a = agg[p.id] ?? { games: 0, pctSum: 0, pctCount: 0, wins: 0, losses: 0, fp: 0 }
        const avg = a.pctCount > 0 ? a.pctSum / a.pctCount : 0

        return {
          player_id: p.id,
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          position: p.position ?? "",
          team_id: teamId,
          team_name: team?.team_name ?? "",
          curling_event_id: evId,
          event_label: labelEvent({ year: ev?.year ?? null, name: ev?.name ?? null }),
          games_played: a.games,
          avg_indv_pct: Math.round(avg * 100) / 100,
          wins: a.wins,
          losses: a.losses,
          total_fantasy_pts: a.fp,
        }
      })
      .filter(Boolean) as Omit<ArchiveRow, "rank">[]

    const byEvent: Record<string, Omit<ArchiveRow, "rank">[]> = {}
    for (const r of builtNoRank) {
      if (!byEvent[r.curling_event_id]) byEvent[r.curling_event_id] = []
      byEvent[r.curling_event_id].push(r)
    }

    const rankedAll: ArchiveRow[] = []
    for (const list of Object.values(byEvent)) {
      const sorted = [...list].sort((a, b) => {
        if (b.total_fantasy_pts !== a.total_fantasy_pts) return b.total_fantasy_pts - a.total_fantasy_pts
        if (b.avg_indv_pct !== a.avg_indv_pct) return b.avg_indv_pct - a.avg_indv_pct
        return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      })
      sorted.forEach((r, idx) => rankedAll.push({ ...r, rank: idx + 1 }))
    }

    const finalSorted = rankedAll.sort((a, b) => {
      if (a.event_label !== b.event_label) return b.event_label.localeCompare(a.event_label)
      if (a.rank !== b.rank) return a.rank - b.rank
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    })

    setRows(finalSorted)
    setLoadingRows(false)
  }

  const derivedTeamsForFilters = useMemo(() => {
    const map = new Map<string, { id: string; team_name: string }>()
    for (const r of rows) {
      if (!r.team_id) continue
      map.set(r.team_id, { id: r.team_id, team_name: r.team_name })
    }
    return Array.from(map.values()).sort((a, b) => a.team_name.localeCompare(b.team_name))
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter(r => {
      if (selectedEventId !== EVENT_ALL && r.curling_event_id !== selectedEventId) return false
      if (filterTeamId !== "ALL" && r.team_id !== filterTeamId) return false
      if (filterPosition !== "ALL" && r.position !== filterPosition) return false
      if (q) {
        const full = `${r.first_name} ${r.last_name}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [rows, selectedEventId, filterTeamId, filterPosition, search])

  const showingText = useMemo(() => {
    const n = filteredRows.length
    return loadingRows ? "Loading players…" : `Showing ${n} player${n === 1 ? "" : "s"}`
  }, [filteredRows.length, loadingRows])

  const anyFiltersApplied =
    selectedEventId !== EVENT_ALL ||
    filterTeamId !== "ALL" ||
    filterPosition !== "ALL" ||
    search.trim().length > 0

  function clearFilters() {
    setSelectedEventId(EVENT_ALL)
    setFilterTeamId("ALL")
    setFilterPosition("ALL")
    setSearch("")
  }

  return (
    <div className="w-full px-3 sm:px-6 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Player Archives</h1>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by player name..."
                  className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md"
                  disabled={loadingEvents || loadingRows}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Event</label>
                <div className="relative">
                  <select
                    value={selectedEventId}
                    onChange={e => {
                      setSelectedEventId(e.target.value)
                      setFilterTeamId("ALL")
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                    disabled={loadingEvents}
                  >
                    <option value={EVENT_ALL}>All events</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {labelEvent({ year: ev.year, name: ev.name })}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Team</label>
                <div className="relative">
                  <select
                    value={filterTeamId}
                    onChange={e => setFilterTeamId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                    disabled={loadingRows || !rows.length}
                  >
                    <option value="ALL">All teams</option>
                    {derivedTeamsForFilters.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Position</label>
                  {anyFiltersApplied && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-red-700 hover:text-red-900"
                      disabled={loadingRows}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={filterPosition}
                    onChange={e => setFilterPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                    disabled={loadingRows}
                  >
                    <option value="ALL">All positions</option>
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse table-fixed sm:table-auto text-xs sm:text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[90px] sm:w-[100px]">Event</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[40px] sm:w-[60px]">Rank</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[120px] sm:w-[220px]">Player</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[120px] sm:w-[220px]">Team</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-left w-[60px] sm:w-[120px]">Position</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-right w-[45px] sm:w-[110px]">Avg %</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-right w-[45px] sm:w-[110px]">W</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-right w-[45px] sm:w-[110px]">L</th>
                    <th className="py-1 px-1 sm:py-2 sm:px-3 text-right w-[45px] sm:w-[120px]">Total FP</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingRows && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-600">
                        Loading...
                      </td>
                    </tr>
                  )}

                  {!loadingRows && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-600">
                        No results.
                      </td>
                    </tr>
                  )}

                  {!loadingRows &&
                    filteredRows.map((r, idx) => (
                      <tr key={`${r.player_id}-${r.curling_event_id}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-2 px-2 sm:px-3 font-medium">
                          <div className="truncate">{r.event_label}</div>
                        </td>
                        <td className="py-2 px-2 sm:px-3 font-medium tabular-nums">{r.rank}</td>
                        <td className="py-2 px-2 sm:px-3 font-medium">
                          <div className="truncate">{r.first_name} {r.last_name}</div>
                        </td>
                        <td className="py-1 px-1 sm:py-2 sm:px-3">
                          <div className="truncate">{r.team_name}</div>
                        </td>
                          <td className="py-1 px-1 sm:py-2 sm:px-3">
                          <div className="truncate">{r.position}</div>
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{r.avg_indv_pct}</td>
                        <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{r.wins}</td>
                        <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{r.losses}</td>
                        <td className="py-2 px-2 sm:px-3 text-right font-semibold tabular-nums">{r.total_fantasy_pts}</td>
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
