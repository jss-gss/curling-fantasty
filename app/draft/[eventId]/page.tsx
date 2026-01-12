"use client"

import { use, useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type ParamsPromise = Promise<{ eventId: string }>

export default function DraftRoom({ params }: { params: ParamsPromise }) {
  const { eventId } = use(params)
  const router = useRouter()

  const [event, setEvent] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [picks, setPicks] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null) // authenticated user
  const [loading, setLoading] = useState(true)

  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<
    string | "all"
  >("all")
  const [curlingEvent, setCurlingEvent] = useState<any>(null)

  // =========================
  // Load all data
  // =========================
  async function loadAll() {
    setLoading(true)

    // 1. Auth user
    const userResp = await supabase.auth.getUser()
    const authUser = userResp?.data?.user ?? null

    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    setUser(authUser)

    // 2. Profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single()

    setProfile(profileData ?? null)

    // 3. Fantasy event
    const { data: e } = await supabase
      .from("fantasy_events")
      .select("*")
      .eq("id", eventId)
      .single()

    setEvent(e ?? null)

    // 4. Curling event
    if (e?.curling_event_id) {
      const { data: ce } = await supabase
        .from("curling_events")
        .select("*")
        .eq("id", e.curling_event_id)
        .single()

      setCurlingEvent(ce ?? null)
    } else {
      setCurlingEvent(null)
    }

    // 5. Users in draft order
    const { data: u } = await supabase
      .from("fantasy_event_users")
      .select("user_id, draft_position, profiles(username)")
      .eq("fantasy_event_id", eventId)
      .order("draft_position")

    setUsers(u ?? [])

    // 6. Players for this curling event
    if (e?.curling_event_id) {
      const { data: playerRows } = await supabase
        .from("players")
        .select(`
          id,
          first_name,
          last_name,
          position,
          player_picture,
          team_id,
          teams (
            id,
            team_name,
            gender,
            slug,
            curling_event_id
          )
        `)
        .eq("teams.curling_event_id", e.curling_event_id)

      setPlayers(playerRows ?? [])
    } else {
      setPlayers([])
    }

    // 7. Existing picks
    const { data: pk } = await supabase
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

    setPicks(pk ?? [])

    setLoading(false)
  }

  // Initial + reload on eventId
  useEffect(() => {
    loadAll()
  }, [eventId])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`draft-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fantasy_events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => setEvent(payload.new)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fantasy_picks",
          filter: `fantasy_event_id=eq.${eventId}`,
        },
        () => loadAll()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  // Auto-select position filter based on round
  useEffect(() => {
    if (!users.length) return

    const totalPicks = picks.length
    const round = Math.min(
      Math.max(Math.floor(totalPicks / users.length) + 1, 1),
      4
    )

    const roundToPosition: Record<number, string> = {
      1: "Lead",
      2: "Second",
      3: "Vice Skip",
      4: "Skip",
    }

    setSelectedPositionFilter(roundToPosition[round] ?? "all")
  }, [users, picks])

  // =========================
  // Derived state
  // =========================

  const currentIndex = useMemo(
    () => (event ? (event.current_pick ?? 1) - 1 : 0),
    [event]
  )

  const currentUser = useMemo(
    () => (users.length ? users[currentIndex] ?? null : null),
    [users, currentIndex]
  )

  const myTurn = currentUser?.user_id === user?.id

  const draftedPlayerIds = useMemo(
    () => new Set(picks.map((p) => p.player_id)),
    [picks]
  )

  const playersToShow = useMemo(
    () =>
      players
        .filter((p) => !draftedPlayerIds.has(p.id))
        .filter((p) => {
          if (selectedPositionFilter === "all") return true
          return p.position === selectedPositionFilter
        }),
    [players, draftedPlayerIds, selectedPositionFilter]
  )

  function slot(position: string) {
    const pick = picks.find(
      (p) => p.user_id === user?.id && p.players?.position === position
    )

    if (!pick) return "—"
    return `${pick.players.first_name} ${pick.players.last_name}`
  }

  async function confirmPick() {
    if (!user || !selectedPlayer) return

    const res = await fetch("/api/pickPlayer", {
      method: "POST",
      body: JSON.stringify({
        eventId,
        playerId: selectedPlayer.id,
        userId: user.id,
      }),
    })

    const data = await res.json()
    console.log("pickPlayer response:", data)

    if (!res.ok) {
      alert(`Error: ${data.error ?? "Unknown error"}`)
      return
    }

  if (data.userFinished || data.draftFinished) {
    router.push("/pick")
    return
  }

    setShowModal(false)
    setSelectedPlayer(null)

    await loadAll()
  }


  if (loading || !event) {
    return (
      <div className="p-6">
        <p>Loading draft...</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* HEADER */}
      <header className="bg-white shadow-md p-6 border border-gray-200 text-center">
        <h1 className="text-4xl font-bold">
          Draft Room — {event?.name ?? "Loading..."}
        </h1>

        <p className="text-gray-600 mt-1">
          The {curlingEvent.name?? ""} event begins on{" "}
          {curlingEvent
            ? new Date(curlingEvent.start_date).toLocaleDateString()
            : "TBD"}
        </p>

        <p className="mt-2 font-medium">
          Current Pick: {event?.current_pick ?? "…"} —{" "}
          {currentUser?.profiles?.username || user?.email || "Loading..."}
        </p>
      </header>

      <div className="flex gap-6">

        {/* LEFT SIDEBAR */}
        <div className="w-1/4 flex flex-col gap-6">

          {/* EVENT LOGO */}
          <div className="bg-white shadow-md p-6 border border-gray-200 h-64 flex items-center justify-center">
            <p className="text-gray-500">Event Logo Here</p>
          </div>

          {/* USER TEAM */}
          <div className="bg-white shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Your Team</h2>

            <p><strong>Lead:</strong> {slot("Lead")}</p>
            <p><strong>Second:</strong> {slot("Second")}</p>
            <p><strong>Vice Skip:</strong> {slot("Vice Skip")}</p>
            <p><strong>Skip:</strong> {slot("Skip")}</p>
          </div>
        </div>

        {/* MAIN DRAFT AREA */}
        <div className="flex-1">

          {myTurn ? (
            <>
              <table className="w-full text-left border-collapse">
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
                  {playersToShow.map((p, index:number) => (
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
                        {p.teams?.team_name ?? "Unknown"}
                      </td>

                      <td className="py-3 px-4">
                        {p.position}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold mb-2">Waiting for the next pick...</h2>
              <p className="text-gray-600">It’s not your turn yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && selectedPlayer && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 shadow-xl rounded-lg w-96 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">Add Player</h3>

            <p className="mb-2 text-lg font-medium">
              {selectedPlayer.first_name} {selectedPlayer.last_name}
            </p>

            <p className="text-gray-600 mb-6">
              from <strong>{selectedPlayer.teams?.team_name}</strong>
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={confirmPick}
                className="px-4 py-2 rounded-md bg-[#162a4a] text-white hover:bg-[#1d355f]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}