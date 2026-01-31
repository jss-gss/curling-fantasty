"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { AchievementId } from "@/lib/achievementIcons"
import { getAchievementIcon } from "@/lib/getAchievementIcon"
import AchievementModal from "@/components/AchievementModal"

type DraftClientProps = {
  slug: string
}

type Profile = {
  id: string
  username?: string
}

type FantasyEvent = {
  id: string
  slug: string
  name: string
  created_by: string
  draft_status: string
  current_pick: number
  curling_event_id: string | null
  turn_started_at: string | null
}

type Player = {
  id: string
  first_name: string
  last_name: string
  position: string
  team_id: string
}

type FantasyEventUser = {
  user_id: string
  draft_position: number
  profiles: { username: string } | null
}

type Pick = {
  id: string
  player_id: string
  user_id: string
  players: {
    first_name: string
    last_name: string
    position: string
    team_id: string
  }
}

type Team = {
  id: string
  team_name: string
}

export default function DraftClient({ slug }: DraftClientProps) {
  const router = useRouter()

  // for testing
  const DISABLE_AUTODRAFT = false

  const [userId, setUserId] = useState<string | null>(null)
  const [event, setEvent] = useState<FantasyEvent | null>(null)
  const [users, setUsers] = useState<FantasyEventUser[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>("all")
  const [curlingEvent, setCurlingEvent] = useState<any>(null)
  const [myPickNumber, setMyPickNumber] = useState<number | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [achievements, setAchievements] = useState<any[]>([])
  const [achievementModal, setAchievementModal] = useState<AchievementId | null>(null)
  const achievementFromDB = achievements.find(a => a.code === achievementModal)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all")
  const [availableOnly, setAvailableOnly] = useState<boolean>(true)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const [showRules, setShowRules] = useState(false)
  const ALL_POSITIONS = ["Lead", "Second", "Vice Skip", "Skip"] as const
  const [showSearch, setShowSearch] = useState(false)
  const [playerSearch, setPlayerSearch] = useState("")
  const tableWrapRef = useRef<HTMLDivElement | null>(null)
  const filtersApplied = selectedTeamFilter !== "all" || selectedPositionFilter !== "all"
  const [turnEndedPopup, setTurnEndedPopup] = useState<string | null>(null)
  const prevPickRef = useRef<number | null>(null)
  const armedAutoCloseRef = useRef(false)
  const turnEndedTimeoutRef = useRef<number | null>(null)
  const totalDrafters = users?.length || 1
  const overallPick = event?.current_pick ?? 0
  const currentRound = overallPick > 0 ? Math.floor((overallPick - 1) / totalDrafters) + 1 : 1
  const pickInRound = overallPick > 0 ? ((overallPick - 1) % totalDrafters) + 1 : 1
  const roundsTotal = 4
  const picksUntilMyTurn = useMemo(() => {
    const n = users?.length ?? 0
    if (!n) return null

    const overallPick = event?.current_pick ?? 0
    const currentPickIndex = Math.max(0, overallPick - 1)

    const myDrafterIndex =
      typeof myPickNumber === "number" ? myPickNumber - 1 : null
    if (myDrafterIndex === null) return null

    const maxIndexExclusive = roundsTotal * n

    if (currentPickIndex >= maxIndexExclusive) return null

    if (snakeDraftIndex(currentPickIndex + 1, n) === myDrafterIndex) return 0

    for (let idx = currentPickIndex + 1; idx < maxIndexExclusive; idx++) {
      if (snakeDraftIndex(idx + 1, n) === myDrafterIndex) {
        return idx - currentPickIndex
      }
    }

    return null
  }, [users?.length, event?.current_pick, myPickNumber])

  useEffect(() => {
    if (!userId || !event?.id) return

    const mine = picks.filter(p => p.user_id === userId).length
    if (mine >= 4) {
      router.push("/myrinks")
    }
  }, [picks, userId, event?.id, router])

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
    const ts = event?.turn_started_at
    if (!ts || event?.draft_status !== "closed") {
      setSecondsLeft(null)
      return
    }

    const update = () => {
      const startedMs = new Date(ts).getTime()
      const elapsed = Math.floor((Date.now() - startedMs) / 1000)
      setSecondsLeft(Math.max(0, 45 - elapsed))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [event?.turn_started_at, event?.draft_status, event?.current_pick])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      const { data, error } = await supabase.auth.getUser()
      const user = data?.user

      if (cancelled) return

      if (error || !user) {
        router.push("/")
        return
      }

      const res = await fetch("/api/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, userId: user.id }),
      })

      const access = await res.json()

      if (!access.allowed) {
        router.push("/")
        return
      }

      setUserId(user.id)
      loadAll(user.id)
    }

    boot()

    return () => {
      cancelled = true
    }
  }, [slug, router])

  useEffect(() => {
    if (!showSearch) return

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      const q = playerSearch.trim()

      const clickedSearch = !!searchWrapRef.current?.contains(t)
      if (clickedSearch) return

      const clickedTable = !!tableWrapRef.current?.contains(t)

      if (q.length > 0) {
        if (clickedTable) return
        setShowSearch(false)
        setPlayerSearch("")
        return
      }

      setShowSearch(false)
      setPlayerSearch("")
    }

    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [showSearch, playerSearch])

  const { currentUser, myTurn } = useMemo(() => {
    const pick = event?.current_pick ?? 1
    const n = users.length

    if (!event || n === 0) {
      return { currentUser: null as FantasyEventUser | null, myTurn: false }
    }

    const userIndex = snakeDraftIndex(pick, n)
    const cu = users[userIndex] ?? null
    const turn = !!(userId && cu?.user_id === userId)

    return { currentUser: cu, myTurn: turn }
  }, [event?.current_pick, users, userId])
  
  useEffect(() => {
    if (!myTurn) return

    setSelectedTeamFilter("all")
    setSelectedPositionFilter("all")
    setAvailableOnly(true)
  }, [myTurn])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          router.push("/thepin")
          return
        }

        const res = await fetch("/api/check-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slug, userId: session.user.id }),
        })

        const data = await res.json()

        if (!data.allowed) {
          router.push("/thepin")
          return
        }

        setUserId(session.user.id)
        loadAll(session.user.id)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [slug])

  useEffect(() => {
    if (!event?.id) return
    if (event.draft_status !== "closed") return

    const interval = setInterval(() => {
      refreshDraftState(event.id)
    }, 1000)

    return () => clearInterval(interval)
  }, [event?.id, event?.draft_status])

  useEffect(() => {
    if (!event?.id) return
    const channel = supabase
      .channel(`draft-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fantasy_events",
          filter: `id=eq.${event.id}`,
        },
        payload => {
          const newPick = payload.new.current_pick
          const oldPick = payload.old.current_pick
          const newStatus = payload.new.draft_status
          const oldStatus = payload.old.draft_status

          if (newPick !== oldPick || newStatus !== oldStatus) {
            refreshDraftState(event.id)
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id])

  useEffect(() => {
    if (DISABLE_AUTODRAFT) return
    if (!event?.id) return
    if (event.draft_status !== "closed") return

    let cancelled = false

    const tick = async () => {
      try {
        await fetch("/api/autoDraft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id }),
        })
      } catch {}
    }

    tick()

    const interval = setInterval(() => {
      if (!cancelled) tick()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [event?.id, event?.draft_status])

  
  const draftedPlayerIds = useMemo(
    () => new Set(picks.map(p => p.player_id)),
    [picks]
  )

  const myPickedPositions = useMemo(() => {
    return new Set(
      picks
        .filter(p => p.user_id === userId)
        .map(p => p.players?.position)
        .filter(Boolean) as string[]
    )
  }, [picks, userId])

  useEffect(() => {
    if (!myTurn) return
    if (selectedPositionFilter === "all") return
    if (myPickedPositions.has(selectedPositionFilter)) {
      setSelectedPositionFilter("all")
    }
  }, [myTurn, selectedPositionFilter, myPickedPositions])

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {}
    teams.forEach(t => {
      map[String(t.id)] = String(t.team_name)
    })
    return map
  }, [teams])

  const rows = useMemo(() => {
    return players.map(p => ({
      ...p,
      team_name: teamMap[p.team_id] ?? "Unknown",
      drafted: draftedPlayerIds.has(p.id),
      position_taken: myPickedPositions.has(p.position),
    }))
  }, [players, teamMap, draftedPlayerIds, myPickedPositions])

  const slotLine = (position: string) => {
    const pick = picks.find(
      (pk: any) => pk.user_id === userId && pk.players?.position === position
    )

    if (!pick?.players) return "—"

    const name = `${pick.players.first_name} ${pick.players.last_name}`
    const team = teamMap?.[pick.players.team_id] ?? "Unknown Team"

    return (
      <>
        {name} <span className="italic text-xs text-gray-600">— Team {team}</span>
      </>
    )
  }

  const remainingPositions = useMemo(() => {
    return ALL_POSITIONS.filter(pos => !myPickedPositions.has(pos))
  }, [myPickedPositions])

  async function handleConfirm() {
    if (!userId || !selectedPlayer || !event?.id || !myTurn || draftedPlayerIds.has(selectedPlayer.id) || myPickedPositions.has(selectedPlayer.position)) return
    const pickedPlayer = selectedPlayer
    
    const alreadyHavePosition = picks.some(
      pk => pk.user_id === userId && pk.players?.position === pickedPlayer.position
    )
    if (alreadyHavePosition) {
      setIsSubmitting(false)
      setSelectedPlayer(null)
      return
    }

    setIsSubmitting(true)
    setShowModal(false)
    setPlayers(prev => prev.filter(p => p.id !== pickedPlayer.id))

    const res = await fetch("/api/pickPlayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        playerId: pickedPlayer.id,
        userId,
      }),
    })

    setSelectedPlayer(null)
    setIsSubmitting(false)
    setAvailableOnly(true)

    if (!res.ok) return

    const isHoman =
      pickedPlayer.first_name?.trim().toLowerCase() === "rachel" &&
      pickedPlayer.last_name?.trim().toLowerCase() === "homan"

    if (isHoman) {
      setAchievementModal("HOMAN_WARRIOR")

      const { data: homanRow } = await supabase
        .from("achievements")
        .select("id, code, name, description")
        .eq("code", "HOMAN_WARRIOR")
        .single()

      if (homanRow?.id) {
        await supabase
          .from("user_achievements")
          .upsert(
            { user_id: userId, achievement_id: homanRow.id },
            { onConflict: "user_id,achievement_id" }
          )

        setAchievements(prev => {
          const exists = prev.some(a => a.code === homanRow.code)
          return exists ? prev : [...prev, homanRow]
        })
      }

      return
    }

    await refreshDraftState(event.id)

    const { data: myPicks } = await supabase
      .from("fantasy_picks")
      .select("id")
      .eq("fantasy_event_id", event.id)
      .eq("user_id", userId)

    if ((myPicks?.length ?? 0) >= 4) {
      router.push("/myrinks")
    }
  }

  function formatDate(dateString: string) {
    const [year, month, day] = dateString.split("-")
    return `${month}/${day}/${year}`
  }

  const filteredRows = useMemo(() => {
    const q = playerSearch.trim().toLowerCase()

    let base = rows
      .filter(p => (selectedTeamFilter === "all" ? true : String(p.team_id) === String(selectedTeamFilter)))
      .filter(p => (selectedPositionFilter === "all" ? true : p.position === selectedPositionFilter))
      .filter(p => (availableOnly ? !p.drafted : true))
      .filter(p => (myTurn ? !myPickedPositions.has(p.position) : true))

    if (showSearch) {
      if (!q) return base

      return base.filter(p => {
        const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase()
        return name.includes(q)
      })
    }

    return base
  }, [
    rows,
    showSearch,
    playerSearch,
    selectedTeamFilter,
    selectedPositionFilter,
    availableOnly,
    myTurn,
    myPickedPositions,
  ])

  async function loadAll(uid: string) {
    setLoading(true)

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single()

    setProfile(profileData ?? null)

    const { data: e } = await supabase
      .from("fantasy_events")
      .select("*")
      .eq("slug", slug)
      .single()

    setEvent(e)

    if (!e) {
      setLoading(false)
      return
    }

    if (e.curling_event_id) {
      const { data: ce } = await supabase
        .from("curling_events")
        .select("*")
        .eq("id", e.curling_event_id)
        .single()

      setCurlingEvent(ce ?? null)

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, team_name")
        .eq("curling_event_id", e.curling_event_id)

      setTeams(teamsData ?? [])

      const teamIds = teamsData?.map(t => t.id) ?? []

      const { data: playerRows } = await supabase
        .from("players")
        .select("*")
        .in("team_id", teamIds)

      setPlayers(playerRows ?? [])
    } else {
      setCurlingEvent(null)
      setTeams([])
      setPlayers([])
    }

    const { data: u } = await supabase
      .from("fantasy_event_users")
      .select("user_id, draft_position, profiles(username)")
      .eq("fantasy_event_id", e.id)
      .order("draft_position") as { data: FantasyEventUser[] | null }

    setUsers(u ?? [])

    const myRow = u?.find(row => row.user_id === uid)
    setMyPickNumber(myRow?.draft_position ?? null)

    const { data: pkRaw } = await supabase
      .from("fantasy_picks")
      .select(`
        id,
        player_id,
        user_id,
        players (
          first_name,
          last_name,
          position,
          team_id
        )
      `)
      .eq("fantasy_event_id", e.id)

    const pk: Pick[] =
      pkRaw?.map((p: any) => ({
        ...p,
        players: Array.isArray(p.players) ? p.players[0] : p.players,
      })) ?? []

    setPicks(pk)
    setLoading(false)
  }

  async function refreshDraftState(eventId: string) {
    const { data: eventData } = await supabase
      .from("fantasy_events")
      .select("current_pick, turn_started_at, draft_status")
      .eq("id", eventId)
      .single()

    if (eventData) {
      setEvent(prev =>
        prev
          ? {
              ...prev,
              current_pick: eventData.current_pick,
              turn_started_at: eventData.turn_started_at,
              draft_status: eventData.draft_status,
            }
          : prev
      )
    }

    const { data: pkRaw } = await supabase
      .from("fantasy_picks")
      .select(`
        id,
        player_id,
        user_id,
        players (
          first_name,
          last_name,
          position,
          team_id
        )
      `)
      .eq("fantasy_event_id", eventId)

    if (pkRaw) {
      const pk: Pick[] = pkRaw.map((p: any) => ({
        ...p,
        players: Array.isArray(p.players) ? p.players[0] : p.players,
      }))
      setPicks(pk)
    }
  }

  useEffect(() => {
    const currentPick = event?.current_pick ?? null

    if (!showModal) {
      prevPickRef.current = currentPick
      armedAutoCloseRef.current = false
      return
    }

    if (showModal && myTurn && secondsLeft === 0) {
      armedAutoCloseRef.current = true
    }

    const prevPick = prevPickRef.current

    if (
      armedAutoCloseRef.current &&
      prevPick !== null &&
      currentPick !== null &&
      currentPick !== prevPick
    ) {
      setShowModal(false)
      setSelectedPlayer(null)
      setIsSubmitting(false)

      setTurnEndedPopup("Your turn ended — auto-pick was made.")

      if (turnEndedTimeoutRef.current) {
        window.clearTimeout(turnEndedTimeoutRef.current)
      }
      turnEndedTimeoutRef.current = window.setTimeout(() => {
        setTurnEndedPopup(null)
        turnEndedTimeoutRef.current = null
      }, 4000)

      armedAutoCloseRef.current = false
    }

    prevPickRef.current = currentPick
  }, [showModal, myTurn, secondsLeft, event?.current_pick])

  // snake
  function snakeDraftIndex(currentPick: number, numUsers: number) {
    if (numUsers <= 0) return 0
    const round = Math.floor((currentPick - 1) / numUsers) + 1
    const offset = (currentPick - 1) % numUsers
    return round % 2 === 1 ? offset : (numUsers - 1 - offset)
  }

  const DraftRulesCard = (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
      <h2 className="text-lg font-semibold mb-3">Draft Rules</h2>

      <div className="space-y-2 text-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between py-1">
            <span className="text-gray-700">Draft format</span>
            <span className="font-semibold">Snake draft</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-gray-700">Roster rules</span>
            <span className="font-semibold">One player per position</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-gray-700">Total picks</span>
            <span className="font-semibold">4 players</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-gray-700">Draft timer</span>
            <span className="font-semibold">45 seconds</span>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="rounded-lg p-3 text-xs text-gray-700 space-y-4">
          <p>
            When it’s <span className="font-semibold">not your turn</span>, you can browse all available players.
          </p>

          <p>
            When it <span className="font-semibold">is your turn</span>, positions you’ve already drafted are automatically hidden.
          </p>

          <p>
            If your timer expires, a player is automatically selected in roster order.          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="min-h-screen bg-[#234C6A]">
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    Draft Room <span className="font-semibold">—</span>{" "}
                    <span>{event?.name ?? "Loading..."}</span>
                  </h1>

                  <p className="text-sm text-gray-600 mt-1">
                    The {curlingEvent?.year}{" "}
                    {curlingEvent?.name ? (
                      <>
                        {curlingEvent.name} begins on{" "}
                        <span className="font-semibold">
                          {formatDate(curlingEvent.start_date)}
                        </span>
                      </>
                    ) : (
                      "Loading event…"
                    )}
                  </p>
                </div>

                {event?.draft_status === "closed" && typeof secondsLeft === "number" && (
                  <div className="flex items-center gap-2 self-center sm:self-start">
                    <span className="text-sm font-semibold whitespace-nowrap">Auto-pick</span>

                    <div className="relative w-10 h-10">
                      <svg viewBox="0 0 44 44" className="w-10 h-10">
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="rgba(0,0,0,0.10)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="#b45309"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={
                            (2 * Math.PI * 18) *
                            (1 - Math.max(0, Math.min(1, secondsLeft / 45)))
                          }
                          transform="rotate(-90 22 22)"
                        />
                      </svg>

                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
                        {secondsLeft}s
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-gray-700">
                  <div className="w-full sm:w-[200px]">
                    <div
                      className={`w-full rounded-lg border px-2 py-1.5 text-xs sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-center ${
                        myTurn
                          ? "border-green-200 bg-green-50 text-green-900"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      {myTurn
                        ? "It’s your pick!"
                        : typeof picksUntilMyTurn === "number"
                        ? `Your turn in ${picksUntilMyTurn} pick${
                            picksUntilMyTurn === 1 ? "" : "s"
                          }.`
                        : "Waiting for your next pick…"}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-x-3 text-sm text-gray-700">
                    <span>
                      <span className="font-semibold">Round:</span> {currentRound}
                    </span>

                    <span className="hidden sm:inline">•</span>

                    <span>
                      <span className="font-semibold">Pick:</span> {pickInRound}
                    </span>

                    <span className="hidden sm:inline">•</span>

                    <span className="whitespace-nowrap">
                      <span className="font-semibold">On the clock:</span>{" "}
                      {currentUser?.profiles?.username ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5">
                <h2 className="text-lg font-semibold mb-2">Your Team</h2>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-2 lg:gap-1.5">
                  <div className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <div className="text-xs font-semibold text-gray-500">Lead</div>
                    <div className="text-sm font-medium mt-1">{slotLine("Lead")}</div>
                  </div>

                  <div className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <div className="text-xs font-semibold text-gray-500">Second</div>
                    <div className="text-sm font-medium mt-1">{slotLine("Second")}</div>
                  </div>

                  <div className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <div className="text-xs font-semibold text-gray-500">Vice Skip</div>
                    <div className="text-sm font-medium mt-1">{slotLine("Vice Skip")}</div>
                  </div>

                  <div className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <div className="text-xs font-semibold text-gray-500">Skip</div>
                    <div className="text-sm font-medium mt-1">{slotLine("Skip")}</div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">{DraftRulesCard}</div>
            </div>

              <div className="lg:col-span-9 h-full min-h-0 flex flex-col">
                <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 flex flex-col min-h-0 h-[120vh] sm:h-auto max-h-[100vh] lg:max-h-none lg:h-[calc(100vh)] overflow-hidden">
                  <div className="flex flex-col min-h-0 flex-1">
                  {!myTurn && (
                    <div className="mb-3 sm:mb-4 rounded-lg bg-red-200 border border-red-900 p-3 text-sm text-red-900">
                      It’s not your turn yet. You can browse the player pool, but you can only select a player when it’s your pick.
                    </div>
                  )}

                  <div className="relative">
                    {!showSearch && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3" ref={searchWrapRef}>
                        <div className="hidden sm:flex sm:col-span-5 items-end">
                          <label className="block text-xs font-semibold text-gray-600">Team</label>
                        </div>

                        <div className="hidden sm:flex sm:col-span-5 items-end">
                          <label className="block text-xs font-semibold text-gray-600">Position</label>
                        </div>

                        <div className="hidden sm:flex sm:col-span-2 items-end justify-end">
                          {filtersApplied && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTeamFilter("all")
                                setSelectedPositionFilter("all")
                              }}
                              className="text-xs font-semibold text-red-700 hover:text-red-900"
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>

                        <div className="sm:hidden flex items-end justify-between">
                          <label className="block text-xs font-semibold text-gray-600">Team</label>
                          {filtersApplied && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTeamFilter("all")
                                setSelectedPositionFilter("all")
                              }}
                              className="text-xs font-semibold text-red-700 hover:text-red-900"
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>

                        <div className="sm:col-span-5">
                          <select
                            value={selectedTeamFilter}
                            onChange={(e) => setSelectedTeamFilter(e.target.value)}
                            className="w-full border px-3 py-2 rounded-lg"
                          >
                            <option value="all">All teams</option>
                            {teams.map((t) => (
                              <option key={t.id} value={String(t.id)}>
                                {t.team_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-5">
                          <div className="sm:hidden mb-1">
                            <label className="block text-xs font-semibold text-gray-600">Position</label>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={selectedPositionFilter}
                              onChange={(e) => setSelectedPositionFilter(e.target.value)}
                              className="w-full border px-3 py-2 rounded-lg"
                            >
                              <option value="all">All positions</option>
                              {(myTurn ? remainingPositions : ALL_POSITIONS).map((pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTeamFilter("all")
                                setSelectedPositionFilter("all")
                                setAvailableOnly(true)
                                setShowSearch(true)
                                setPlayerSearch("")
                              }}
                              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border bg-white hover:bg-gray-50"
                              aria-label="Search players"
                            >
                              <span className="text-gray-700">⌕</span>
                            </button>
                          </div>
                        </div>

                        <div className="sm:col-span-2 flex items-center sm:justify-end">
                          <label className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-800 select-none">
                            <input
                              type="checkbox"
                              checked={availableOnly}
                              onChange={(e) => setAvailableOnly(e.target.checked)}
                              className="h-4 w-4 accent-green-600"
                            />
                            <span className="font-semibold whitespace-nowrap">Available only</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {showSearch && (
                      <div className="w-full rounded-lg bg-white p-3">
                        <div className="relative">
                          <input
                            autoFocus
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            placeholder="Search players…"
                            className="w-full border px-3 py-2 pr-10 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowSearch(false)
                              setPlayerSearch("")
                              setAvailableOnly(true)
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
                            aria-label="Close search"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border border-gray-400 rounded-xl overflow-hidden flex-1 min-h-0" ref={tableWrapRef}>
                    <div className="h-full overflow-auto pr-2">
                      <table className="w-full table-auto sm:table-fixed border-collapse text-left">
                        <thead className="sticky top-0 bg-blue-200 z-10">
                          <tr className="text-gray-700">
                            <th className="w-8 px-1 sm:px-2 py-1 sm:py-3 text-[11px] sm:text-xs font-semibold">#</th>
                            <th className="max-w-[200px] sm:w-[320px] px-1 sm:px-2 py-1 sm:py-3 text-[11px] sm:text-xs font-semibold">Player</th>
                            <th className="max-w-[140px] sm:w-[260px] px-1 sm:px-2 py-1 sm:py-3 text-[11px] sm:text-xs font-semibold">Team</th>
                            <th className="max-w-[90px] sm:w-[160px] px-1 sm:px-6 py-1 sm:py-3 text-[11px] sm:text-xs font-semibold">Position</th>
                            <th className="max-w-[90px] sm:w-[120px] px-1 sm:px-6 py-1 sm:py-3 text-[11px] sm:text-xs font-semibold">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredRows.map((p, index) => {
                            const canPick = myTurn && !p.drafted && !p.position_taken
                            const disabledReason = p.position_taken ? "position filled" : ""

                            return (
                              <tr key={p.id} className={index % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[11px] sm:text-sm text-gray-600">
                                  {index + 1}
                                </td>

                                <td className="px-1 sm:px-4 py-1 sm:py-3 align-middle">
                                  <button
                                    type="button"
                                    disabled={!canPick}
                                    onClick={() => {
                                      if (!canPick) return
                                      setSelectedPlayer(p)
                                      setShowModal(true)
                                    }}
                                    className={`block w-full truncate text-left font-semibold ${
                                      canPick ? "text-[#234C6A] hover:underline" : "text-gray-400 cursor-not-allowed"
                                    } text-[13px] sm:text-base leading-tight`}
                                    title={`${p.first_name} ${p.last_name}`}
                                  >
                                    {p.first_name} {p.last_name}
                                  </button>

                                  {!myTurn && (
                                    <div className="mt-0.5 text-[10px] sm:text-xs text-gray-400">
                                      Waiting for your turn
                                    </div>
                                  )}

                                  {disabledReason && myTurn && (
                                    <div className="mt-0.5 text-[10px] sm:text-xs text-gray-400">
                                      {disabledReason}
                                    </div>
                                  )}
                                </td>

                                <td
                                  className="px-1 sm:px-4 py-1 sm:py-3 truncate text-xs sm:text-sm text-gray-700"
                                  title={p.team_name}
                                >
                                  {p.team_name}
                                </td>

                                <td
                                  className="px-1 sm:px-4 py-1 sm:py-3 truncate text-[11px] sm:text-sm text-gray-700"
                                  title={p.position}
                                >
                                  {p.position}
                                </td>

                                <td className="px-1 sm:px-4 py-1 sm:py-3">
                                  {p.drafted ? (
                                    <span className="inline-flex justify-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-gray-700">
                                      drafted
                                    </span>
                                  ) : (
                                    <span className="inline-flex justify-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-green-700">
                                      available
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:hidden mt-8">{DraftRulesCard}</div>
            </div>
          </div>

          {showModal && selectedPlayer && (
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <div
                className="relative bg-white p-6 shadow-xl rounded-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>

                <h3 className="text-xl font-bold b-1">Confirm Pick</h3>
                <p className="text-sm text-gray-600 mb-3">
                  This will fill your {selectedPlayer.position.toLowerCase()} slot.
                </p>

                <div className="p-3 mb-5 bg-blue-50 rounded-md">
                  <div className="text-lg font-semibold text-[#234C6A]">
                    {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Team {teamMap[selectedPlayer.team_id] ?? "Unknown"} • {selectedPlayer.position}
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                  className={`w-full py-2.5 rounded-lg text-white font-semibold transition ${
                    isSubmitting ? "bg-gray-400" : "bg-[#234C6A] hover:bg-[#1B3C53]"
                  }`}
                >
                  {isSubmitting ? "Submitting…" : "Confirm Pick"}
                </button>
              </div>
            </div>
          )}
        </div>

        {turnEndedPopup && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-5 shadow-xl rounded-xl w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-900">Turn ended</h3>
              <p className="text-sm text-gray-600 mt-1">{turnEndedPopup}</p>
            </div>
          </div>
        )}

        {achievementModal && (
          <AchievementModal
            open={true}
            onClose={() => {
              setAchievementModal(null)
            }}
            title={achievementFromDB?.name ?? "Homan Warrior"}
            description={achievementFromDB?.description ?? "You drafted Rachel Homan!"}
            icon={getAchievementIcon(achievementModal)}
          />
        )}
      </div>
    </>
  )
}