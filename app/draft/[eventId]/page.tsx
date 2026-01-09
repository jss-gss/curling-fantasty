"use client"

import { use, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ParamsPromise = Promise<{ eventId: string }>

export default function DraftRoom({ params }: { params: ParamsPromise }) {
  const { eventId } = use(params)

  const [event, setEvent] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const { data: userData } = await supabase.auth.getUser()
    setUser(userData.user)

    const { data: e } = await supabase
      .from("fantasy_events")
      .select("*")
      .eq("id", eventId)
      .single()

    const { data: u } = await supabase
      .from("fantasy_event_users")
      .select("user_id, draft_position")
      .eq("fantasy_event_id", eventId)
      .order("draft_position")

    const { data: p } = await supabase
      .from("players")
      .select("*")
      .eq("curling_event_id", e?.curling_event_id)

    setEvent(e ?? null)
    setUsers(u ?? [])
    setPlayers(p ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [eventId])

  // Realtime: update event + players when things change
  useEffect(() => {
    const channel = supabase
      .channel(`draft-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fantasy_events", filter: `id=eq.${eventId}` },
        (payload) => {
          setEvent(payload.new)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fantasy_picks", filter: `fantasy_event_id=eq.${eventId}` },
        () => {
          // reload players when picks change
          loadAll()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  async function pickPlayer(playerId: string) {
    if (!user) return

    await fetch("/api/pickPlayer", {
      method: "POST",
      body: JSON.stringify({
        eventId,
        playerId,
        userId: user.id,
      }),
    })
  }

  if (loading || !event || !user) {
    return <p className="p-6">Loading draft...</p>
  }

  const currentIndex = (event.current_pick ?? 1) - 1
  const currentUser = users[currentIndex]
  const myTurn = currentUser?.user_id === user.id

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">
        Draft Room — {event.name}
      </h1>

      <p className="mb-4">
        Current Pick: {event.current_pick}{" "}
        {currentUser ? `(User: ${currentUser.user_id})` : null}
      </p>

      {myTurn ? (
        <>
          <h2 className="text-xl font-semibold mb-2">It’s your turn!</h2>
          <table className="min-w-full border mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Player</th>
                <th className="border px-2 py-1 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="border px-2 py-1">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => pickPlayer(p.id)}
                      className="bg-[#162a4a] text-white px-3 py-1 rounded-md"
                    >
                      Draft
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="mt-6 text-center">
          <h2 className="text-xl font-semibold mb-2">
            Waiting for the next pick...
          </h2>
          <p>It’s not your turn yet.</p>
        </div>
      )}
    </div>
  )
}
