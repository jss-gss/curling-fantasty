"use client"

import { useEffect, useState, useMemo } from "react"
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
  profile_image_url?: string
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
  }
}

type Team = {
  id: string
  team_name: string
}

export default function DraftClient({ slug }: DraftClientProps) {
  const router = useRouter()

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
  const [pendingRedirect, setPendingRedirect] = useState(false)
  const achievementFromDB = achievements.find(a => a.code === achievementModal)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!event) return
    if (event.draft_status === "locked") {
      router.push("/myrinks")
    }
  }, [event?.draft_status])

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
      setSecondsLeft(Math.max(0, 30 - elapsed))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [event?.turn_started_at, event?.draft_status, event?.current_pick])

  useEffect(() => {
    supabase.auth.getUser().then(res => {
    })
  }, [])

  const currentIndex = useMemo(
    () => (event ? (event.current_pick ?? 1) - 1 : 0),
    [event]
  )

  const currentUser = useMemo(
    () => (users.length ? users[currentIndex] ?? null : null),
    [users, currentIndex]
  )

  const myTurn = currentUser?.user_id === userId

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          router.push("/")
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
          router.push("/")
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
          position
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
          position
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
    if (!users.length) return
    const totalPicks = picks.length
    const round = Math.min(Math.max(Math.floor(totalPicks / users.length) + 1, 1), 4)
    const roundToPosition: Record<number, string> = {
      1: "Lead",
      2: "Second",
      3: "Vice Skip",
      4: "Skip",
    }
    setSelectedPositionFilter(roundToPosition[round] ?? "all")
  }, [users, picks])

  const draftedPlayerIds = useMemo(
    () => new Set(picks.map(p => p.player_id)),
    [picks]
  )

  const playersToShow = useMemo(
    () =>
      players
        .filter(p => !draftedPlayerIds.has(p.id))
        .filter(p => {
          if (selectedPositionFilter === "all") return true
          return p.position === selectedPositionFilter
        }),
    [players, draftedPlayerIds, selectedPositionFilter]
  )

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {}
    teams.forEach(t => {
      map[String(t.id)] = String(t.team_name)
    })
    return map
  }, [teams])

  async function handleConfirm() {
    if (!userId || !selectedPlayer) return

    setIsSubmitting(true)
    setShowModal(false)
    setPlayers(prev => prev.filter(p => p.id !== selectedPlayer.id))

    const res = await fetch("/api/pickPlayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event?.id,
        playerId: selectedPlayer.id,
        userId,
      }),
    })

    const data = await res.json()

    setSelectedPlayer(null)
    setIsSubmitting(false)

    if (!res.ok || !event) return

    await refreshDraftState(event.id)

    if (
      selectedPlayer.first_name === "Rachel" &&
      selectedPlayer.last_name === "Homan"
    ) {
      const homanRow = achievements.find((a: any) => a.code === "HOMAN_WARRIOR")

      if (homanRow) {
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("id")
          .eq("user_id", userId)
          .eq("achievement_id", homanRow.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from("user_achievements").insert({
            user_id: userId,
            achievement_id: homanRow.id
          })
        }
      }

      setAchievementModal("HOMAN_WARRIOR")

      setPendingRedirect(true)

      return
    }

    if (data.userFinished || data.draftFinished) {
      router.push("/myrinks")
    }
  }

  function slot(position: string) {
    const pick = picks.find(
      p => p.user_id === userId && p.players?.position === position
  )

  if (!pick) return "—"
    return `${pick.players.first_name} ${pick.players.last_name}`
  }

  useEffect(() => {
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
      } catch {
      }
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

  function formatDate(dateString: string) {
    const [year, month, day] = dateString.split("-")
    return `${month}/${day}/${year}`
  }

  return (
    <>
      <div className="p-6 flex flex-col gap-6 bg-[#234C6A]">
        <header className="bg-white shadow-md p-6 border border-gray-200 text-center rounded-lg">
        <h1 className="text-4xl font-bold">
            Draft Room — {event?.name ?? "Loading..."}
        </h1>
        <p className="text-gray-600 mt-1">
            The {curlingEvent?.name ?? ""} event begins on{" "}
            {formatDate(curlingEvent?.start_date ?? "TBD")}{" "}
        </p>
        </header>

        <div className="flex gap-6">
        <div className="w-1/4 flex flex-col gap-6">
            <div className="bg-white shadow-md p-6 border border-gray-200 rounded-lg flex flex-col items-center justify-center h-64 text-center">
            <h2 className="text-xl font-semibold mb-3">Your Pick Number</h2>
            <div className="text-5xl font-bold text-[#162a4a] mb-4">
                {myPickNumber ?? "—"}
            </div>
            <p className="text-gray-600">
                Current Pick: <strong>{event?.current_pick ?? "…"}</strong>
            </p>
            <p className="text-gray-600">
                User:{" "}
                <strong>
                {currentUser?.profiles?.username ?? "—"}
                </strong>
            </p>

            </div>
            <div className="bg-white shadow-md p-6 border border-gray-200 rounded-lg">
              {event?.draft_status === "closed" && (
                <p className="text-gray-600 text-center">
                  Auto-pick in: <strong>{secondsLeft ?? "…"}</strong>s
                </p>
              )}
            </div>
            <div className="bg-white shadow-md p-6 border border-gray-200 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Your Team</h2>
            <p><strong>Lead:</strong> {slot("Lead")}</p>
            <p><strong>Second:</strong> {slot("Second")}</p>
            <p><strong>Vice Skip:</strong> {slot("Vice Skip")}</p>
            <p><strong>Skip:</strong> {slot("Skip")}</p>
            </div>
        </div>

        <div className="flex-1">
            {myTurn ? (
            <>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <table className="w-full text-left border-collapse rounded-lg overflow-hidden">
                <thead>
                    <tr className="bg-gray-100 text-gray-700">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Pic</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Position</th>
                    </tr>
                </thead>
                <tbody>
                    {playersToShow.map((p: any, index: number) => (
                    <tr
                        key={p.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">
                        <img
                            src={p.player_picture || "/default-player.png"}
                            className="w-10 h-10 rounded-full object-cover"
                            alt={`${p.first_name} ${p.last_name}`}
                        />
                        </td>
                        <td
                        className="py-3 px-4 font-medium text-blue-700 cursor-pointer hover:underline"
                        onClick={() => {
                            setSelectedPlayer(p)
                            setShowModal(true)
                        }}
                        >
                        {p.first_name} {p.last_name}
                        </td>
                        <td className="py-3 px-4">
                        {teamMap[p.team_id] ?? "Unknown"}
                        </td>
                        <td className="py-3 px-4">
                        {p.position}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
              </div>
            </>
            ) : (
            <div className="text-center py-10">
                <h2 className="text-xl text-white font-semibold mb-2">Waiting for the next pick...</h2>
                <p className="text-white">It’s not your turn yet.</p>
            </div>
            )}
        </div>
        </div>
        {showModal && selectedPlayer && (
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="relative bg-white p-6 shadow-xl rounded-lg w-96 border border-gray-200">

              {/* X button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>

              <h3 className="text-xl font-semibold mb-4">Add Player</h3>

              {/* Image + Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                  {selectedPlayer.profile_image_url ? (
                    <img
                      src={selectedPlayer.profile_image_url}
                      alt={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div />
                  )}
                </div>

                <div>
                  <p className="text-lg font-medium">
                    {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </p>
                  <p className="text-gray-600">
                    from <strong>{teamMap[selectedPlayer.team_id]}</strong>
                  </p>
                </div>
              </div>

              {/* Confirm button */}
              <button
                disabled={isSubmitting}
                onClick={handleConfirm}
                className={`w-full py-2 rounded-md text-white 
                  ${isSubmitting ? "bg-gray-400" : "bg-[#234C6A ] hover:bg-[#163766]"}
                `}
              >
                {isSubmitting ? "Submitting..." : "Confirm Pick"}
              </button>
            </div>
          </div>
        )}
      </div>

      {achievementModal && (
        <AchievementModal
          open={true}
          onClose={() => {
            setAchievementModal(null)
            if (pendingRedirect) {
              router.push("/myrinks")
            }
          }}
          title={achievementFromDB?.name}
          description={achievementFromDB?.description}
          icon={getAchievementIcon(achievementModal)}
        />
      )}
    </>
  )
}