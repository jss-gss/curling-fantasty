"use client"

import { use, useEffect, useState } from "react"
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
  const [positions, setPositions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<number | "all">("all")

  const [curlingEvent, setCurlingEvent] = useState<any>(null)

  async function loadAll() {
    setLoading(true)

    const userResp = await supabase.auth.getUser()
    const currentUser = userResp?.data?.user ?? null
    if (!currentUser) {
      setUser(null)
      setLoading(false)
      return
    }
    setUser(currentUser)

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single()
    setProfile(profileData ?? null)

    const { data: e } = await supabase
      .from("fantasy_events")
      .select("*")
      .eq("id", eventId)
      .single()
    setEvent(e ?? null)

    if (e?.curling_event_id) {
      const { data: ce } = await supabase
        .from("curling_events")
        .select("*")
        .eq("id", e.curling_event_id)
        .single()

      setCurlingEvent(ce ?? null)
    }

    const { data: u } = await supabase
      .from("fantasy_event_users")
      .select("user_id, draft_position, profiles(username)")
      .eq("fantasy_event_id", eventId)
      .order("draft_position")
    setUsers(u ?? [])

    const { data: pos } = await supabase.from("positions").select("*").order("id")
    setPositions(pos ?? [])

    const { data: playerRows } = await supabase
      .from("player_event_teams")
      .select(`
        id,
        position_id,
        team:teams(id, team_name),
        player:players(id, first_name, last_name, player_picture)
      `)
      .eq("curling_event_id", e?.curling_event_id)

    const formattedPlayers =
      (playerRows ?? []).map((row: any) => ({
        pet_id: row.id,
        id: row.player?.id ?? null,
        first_name: row.player?.first_name ?? "",
        last_name: row.player?.last_name ?? "",
        player_picture: row.player?.player_picture ?? null,
        team_name: row.team?.team_name ?? "Unknown",
        position_id: row.position_id ?? null,
      }))

    setPlayers(formattedPlayers)

    const { data: pk } = await supabase
      .from("fantasy_picks")
      .select("id, player_id, user_id, position_id, players(first_name, last_name), positions(position_title)")
      .eq("fantasy_event_id", eventId)
    setPicks(pk ?? [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [eventId])

  useEffect(() => {
    const channel = supabase
      .channel(`draft-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fantasy_events", filter: `id=eq.${eventId}` },
        (payload) => setEvent(payload.new)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fantasy_picks", filter: `fantasy_event_id=eq.${eventId}` },
        () => loadAll()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  useEffect(() => {
    if (!users.length) return
    const totalPicks = picks.length
    const round = Math.min(Math.max(Math.floor(totalPicks / users.length) + 1, 1), 4)
    setSelectedPositionFilter(round)
  }, [users, picks])

  async function confirmPick() {
    if (!user || !selectedPlayer) return

    await fetch("/api/pickPlayer", {
      method: "POST",
      body: JSON.stringify({
        eventId,
        playerId: selectedPlayer.id,
        userId: user.id,
      }),
    })

    setShowModal(false)
    setSelectedPlayer(null)

    const { data: userPicks } = await supabase
      .from("fantasy_picks")
      .select("position_id")
      .eq("fantasy_event_id", eventId)
      .eq("user_id", user.id)

    const hasSkip = (userPicks ?? []).some((p: any) => p.position_id === 4)
    if (hasSkip) {
      router.push("/home")
      return
    }

    await loadAll()
  }

  if (loading || !event || !user) {
    return <p className="p-6">Loading draft...</p>
  }

  if (event.status === "closed" || event.status === "archived") 
  { 
      router.push("/home") 
      return null 
  }

  const currentIndex = (event.current_pick ?? 1) - 1
  const currentUser = users[currentIndex]
  const myTurn = currentUser?.user_id === user.id

  const myPicks = picks.filter((p) => p.user_id === user.id)
  const draftedPlayerIds = new Set(picks.map((p) => p.player_id))

  const playersToShow = players
    .filter((p) => p.id && !draftedPlayerIds.has(p.id))
    .filter((p) => {
      if (selectedPositionFilter === "all") return true
      return p.position_id === selectedPositionFilter
    })

  const slot = (pos: number) => {
    const pick = myPicks.find((p) => p.position_id === pos)
    if (!pick) return "—"
    return `${pick.players.first_name} ${pick.players.last_name}`
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <header className="bg-white shadow-md p-6 border border-gray-200 text-center">
        <h1 className="text-4xl font-bold">Draft Room — {event.name}</h1>
        <p className="text-gray-600 mt-1">
          The {event.description} event begins on{" "}
          {curlingEvent
            ? new Date(curlingEvent.start_date).toLocaleDateString()
            : "TBD"}
        </p>
        <p className="mt-2 font-medium">
          Current Pick: {event.current_pick} —{" "}
          {currentUser?.profiles?.username || user.email}
        </p>
      </header>

      <div className="flex gap-6">
        <div className="w-1/4 flex flex-col gap-6">
          <div className="bg-white shadow-md p-6 border border-gray-200 h-64 flex items-center justify-center">
            <p className="text-gray-500">Event Logo Here</p>
          </div>

          <div className="bg-white shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Your Team</h2>
            <p><strong>Lead:</strong> {slot(1)}</p>
            <p><strong>Second:</strong> {slot(2)}</p>
            <p><strong>Vice:</strong> {slot(3)}</p>
            <p><strong>Skip:</strong> {slot(4)}</p>
          </div>
        </div>

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
                  </tr>
                </thead>

                <tbody>
                  {playersToShow.map((p, index) => (
                    <tr
                      key={`${p.id}-${p.position_id}-${p.pet_id}`}
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

                      <td className="py-3 px-4">{p.team_name}</td>

                      <td className="py-3 px-4">
                        {positions.find((pos) => pos.id === p.position_id)?.position_title || "Unknown"}
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

      {showModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Add Player</h3>

            <p className="mb-2 text-lg font-medium">
              {selectedPlayer.first_name} {selectedPlayer.last_name}
            </p>

            <p className="text-gray-600 mb-6">
              from <strong>{selectedPlayer.team_name}</strong>
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
