"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type CurlingEvent = {
  id: string
  name: string
  year: number
  location: string | null
  start_date: string
  end_date: string
}

type Team = {
  id: string
  team_name: string
  curling_event_id: string
}

type Game = {
  id: string
  team_id: string
}

type DrawRow = {
  game_id: string
  player_id: string
  indv_pct: number | null
  won: boolean | null
  fantasy_pts: number | null
}

type Player = {
  id: string
  first_name: string
  last_name: string
  position: string | null
  team_id: string | null
}

type ArchiveRow = {
  player_id: string
  first_name: string
  last_name: string
  position: string
  team_id: string
  team_name: string

  games_played: number
  avg_indv_pct: number
  wins: number
  losses: number
  total_fantasy_pts: number

  rank: number
}

const POSITIONS = ["Lead", "Second", "Vice Skip", "Skip"] as const

function formatEventLabel(ev: CurlingEvent) {
  const loc = ev.location ? ` — ${ev.location}` : ""
  return `${ev.year} ${ev.name}${loc}`
}

export default function EventArchivesClient() {
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)

  const [events, setEvents] = useState<CurlingEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")

  const [teams, setTeams] = useState<Team[]>([])
  const [rows, setRows] = useState<ArchiveRow[]>([])

  const [filterTeamId, setFilterTeamId] = useState<string>("ALL")
  const [filterPosition, setFilterPosition] = useState<string>("ALL")
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    void loadEndedEvents()
  }, [])

  async function loadEndedEvents() {
    setLoadingEvents(true)

    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    const todayStr = `${yyyy}-${mm}-${dd}`

    const { data, error } = await supabase
      .from("curling_events")
      .select("id,name,year,location,start_date,end_date")
      .lt("end_date", todayStr)
      .order("end_date", { ascending: false })

    if (error) {
      console.error(error)
      setEvents([])
      setSelectedEventId("")
      setLoadingEvents(false)
      return
    }

    const evs = (data ?? []) as CurlingEvent[]
    setEvents(evs)
    setSelectedEventId(evs[0]?.id ?? "")
    setLoadingEvents(false)
  }

  useEffect(() => {
    if (!selectedEventId) return
    void loadEventArchive(selectedEventId)
    setFilterTeamId("ALL")
    setFilterPosition("ALL")
    setSearch("")
  }, [selectedEventId])

async function loadEventArchive(eventId: string) {
  setLoadingRows(true)
  setRows([])
  setTeams([])

  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .select("id,team_name,curling_event_id")
    .eq("curling_event_id", eventId)

  if (teamErr) {
    console.error("teams query failed", {
      message: teamErr.message,
      details: teamErr.details,
      hint: teamErr.hint,
      code: teamErr.code,
    })
    setLoadingRows(false)
    return
  }

  const eventTeams = (teamRows ?? []) as Team[]
  setTeams(eventTeams)

  const teamIds = eventTeams.map(t => t.id)
  if (teamIds.length === 0) {
    setRows([])
    setLoadingRows(false)
    return
  }

  const teamNameById = Object.fromEntries(eventTeams.map(t => [t.id, t.team_name]))

  const { data: gameRows, error: gameErr } = await supabase
    .from("games")
    .select("id,team1_id,team2_id,game_datetime")
    .or(`team1_id.in.(${teamIds.join(",")}),team2_id.in.(${teamIds.join(",")})`)

  if (gameErr) {
    console.error("games query failed", {
      message: gameErr.message,
      details: gameErr.details,
      hint: gameErr.hint,
      code: gameErr.code,
    })
    setLoadingRows(false)
    return
  }

  const games = (gameRows ?? []) as { id: string; team1_id: string; team2_id: string }[]
  const gameIds = games.map(g => g.id)

  if (gameIds.length === 0) {
    setRows([])
    setLoadingRows(false)
    return
  }

  const { data: drawRows, error: drawErr } = await supabase
    .from("draws")
    .select("game_id,player_id,indv_pct,won,fantasy_pts")
    .in("game_id", gameIds)

  if (drawErr) {
    console.error("draws query failed", {
      message: drawErr.message,
      details: drawErr.details,
      hint: drawErr.hint,
      code: drawErr.code,
    })
    setLoadingRows(false)
    return
  }

  const draws = (drawRows ?? []) as DrawRow[]
  const playerIds = Array.from(new Set(draws.map(d => d.player_id)))

  if (playerIds.length === 0) {
    setRows([])
    setLoadingRows(false)
    return
  }

  const { data: playerRows, error: playerErr } = await supabase
    .from("players")
    .select("id,first_name,last_name,position,team_id")
    .in("id", playerIds)

  if (playerErr) {
    console.error("players query failed", {
      message: playerErr.message,
      details: playerErr.details,
      hint: playerErr.hint,
      code: playerErr.code,
    })
    setLoadingRows(false)
    return
  }

  const players = (playerRows ?? []) as Player[]
  const playerById: Record<string, Player> = Object.fromEntries(players.map(p => [p.id, p]))

  const agg: Record<
    string,
    { games: number; pctSum: number; pctCount: number; wins: number; losses: number; fp: number }
  > = {}

  for (const d of draws) {
    const pid = d.player_id
    if (!agg[pid]) {
      agg[pid] = { games: 0, pctSum: 0, pctCount: 0, wins: 0, losses: 0, fp: 0 }
    }

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

  const built: Omit<ArchiveRow, "rank">[] = Object.entries(agg)
    .map(([player_id, a]) => {
      const p = playerById[player_id]
      const team_id = p?.team_id ?? ""
      const team_name = teamNameById[team_id] ?? ""

      const avg = a.pctCount > 0 ? a.pctSum / a.pctCount : 0

      return {
        player_id,
        first_name: p?.first_name ?? "",
        last_name: p?.last_name ?? "",
        position: p?.position ?? "",
        team_id,
        team_name,
        games_played: a.games,
        avg_indv_pct: Math.round(avg * 100) / 100,
        wins: a.wins,
        losses: a.losses,
        total_fantasy_pts: a.fp,
      }
    })
    // ensure player team belongs to this event
    .filter(r => teamIds.includes(r.team_id))

  // 7) Rank + sort
  const sorted = [...built].sort((a, b) => {
    if (b.total_fantasy_pts !== a.total_fantasy_pts) return b.total_fantasy_pts - a.total_fantasy_pts
    return b.avg_indv_pct - a.avg_indv_pct
  })

  const ranked: ArchiveRow[] = sorted.map((r, idx) => ({ ...r, rank: idx + 1 }))
  setRows(ranked)
  setLoadingRows(false)
}

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter(r => {
      if (filterTeamId !== "ALL" && r.team_id !== filterTeamId) return false
      if (filterPosition !== "ALL" && r.position !== filterPosition) return false
      if (q) {
        const full = `${r.first_name} ${r.last_name}`.toLowerCase()
        if (!full.includes(q)) return false
      }
      return true
    })
  }, [rows, filterTeamId, filterPosition, search])

  return (
    <div className="w-full px-3 sm:px-6 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Event Archives</h1>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event</label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                  disabled={loadingEvents}
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {formatEventLabel(ev)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
              </div>
            </div>

            <div className="sm:w-[220px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Team</label>
              <div className="relative">
                <select
                  value={filterTeamId}
                  onChange={e => setFilterTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                  disabled={!selectedEventId || loadingRows}
                >
                  <option value="ALL">All Teams</option>
                  {teams
                    .slice()
                    .sort((a, b) => a.team_name.localeCompare(b.team_name))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.team_name}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
              </div>
            </div>

            <div className="sm:w-[180px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Position</label>
              <div className="relative">
                <select
                  value={filterPosition}
                  onChange={e => setFilterPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm appearance-none pr-8 rounded-md"
                  disabled={loadingRows}
                >
                  <option value="ALL">All Positions</option>
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">⌵</div>
              </div>
            </div>

            <div className="sm:w-[260px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md"
                disabled={loadingRows}
              />
            </div>
          </div>

          <div className="mt-4 sm:mt-6 rounded-lg overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse table-fixed sm:table-auto text-xs sm:text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="py-2 px-2 sm:px-3 text-left w-[52px]">Rank</th>
                  <th className="py-2 px-2 sm:px-3 text-left w-[220px]">Player</th>
                  <th className="py-2 px-2 sm:px-3 text-left w-[220px]">Team</th>
                  <th className="py-2 px-2 sm:px-3 text-left w-[110px]">Position</th>
                  <th className="py-2 px-2 sm:px-3 text-right w-[90px]">Avg %</th>
                  <th className="py-2 px-2 sm:px-3 text-right w-[70px]">W</th>
                  <th className="py-2 px-2 sm:px-3 text-right w-[70px]">L</th>
                  <th className="py-2 px-2 sm:px-3 text-right w-[110px]">Total FP</th>
                </tr>
              </thead>

              <tbody>
                {loadingRows && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-600">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loadingRows && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-600">
                      No results.
                    </td>
                  </tr>
                )}

                {!loadingRows &&
                  filteredRows.map((r, idx) => (
                    <tr key={r.player_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-2 px-2 sm:px-3 font-medium tabular-nums">{r.rank}</td>
                      <td className="py-2 px-2 sm:px-3 font-medium">
                        <div className="truncate">{r.first_name} {r.last_name}</div>
                      </td>
                      <td className="py-2 px-2 sm:px-3">
                        <div className="truncate">{r.team_name}</div>
                      </td>
                      <td className="py-2 px-2 sm:px-3">
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

          <div className="mt-3 text-xs text-gray-600">
            Showing {filteredRows.length} players
          </div>
        </div>
      </div>
    </div>
  )
}
