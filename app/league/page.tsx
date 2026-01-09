"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"

export default function LeaguesPage() {
  const [user, setUser] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeagues() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        setUser(null)
        setLeagues([])
        setLoading(false)
        return
      }

      setUser(userData.user)

      const { data: leagueData, error } = await supabase
        .from("fantasy_events")
        .select("*")
        .order("start_date", { ascending: true })

      if (error || !leagueData) {
        setLoading(false)
        return
      }

      const leagueIds = leagueData.map((l) => l.id)

      const { data: memberships } = await supabase
        .from("fantasy_event_users")
        .select("fantasy_event_id")
        .eq("user_id", userData.user.id)
        .in("fantasy_event_id", leagueIds)

      const joinedSet = new Set(memberships?.map((m) => m.fantasy_event_id))

      const now = new Date()

      const leaguesWithStatus = leagueData.map((l) => {
        const isFull = l.num_users >= l.max_users
        const isPastSignup = new Date(l.draft_date) < now

        return {
          ...l,
          joined: joinedSet.has(l.id),
          locked: isFull || isPastSignup,
        }
      })

      setLeagues(leaguesWithStatus)
      setLoading(false)
    }

    loadLeagues()
  }, [])

  async function joinLeague(id: string) {
    if (!user) return

    await supabase.from("fantasy_event_users").insert({
      fantasy_event_id: id,
      user_id: user.id,
    })

    const league = leagues.find((l) => l.id === id)

    await supabase
      .from("fantasy_events")
      .update({ num_users: league.num_users + 1 })
      .eq("id", id)

    setLeagues((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, joined: true, num_users: l.num_users + 1 }
          : l
      )
    )
  }

  async function leaveLeague(id: string) {
    if (!user) return

    await supabase
      .from("fantasy_event_users")
      .delete()
      .eq("fantasy_event_id", id)
      .eq("user_id", user.id)

    const league = leagues.find((l) => l.id === id)

    await supabase
      .from("fantasy_events")
      .update({ num_users: league.num_users - 1 })
      .eq("id", id)

    setLeagues((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, joined: false, num_users: l.num_users - 1 }
          : l
      )
    )
  }

  const currentLeagues = leagues.filter((l) => l.joined)
  const availableLeagues = leagues.filter((l) => !l.joined && !l.locked)
  const lockedLeagues = leagues.filter((l) => !l.joined && l.locked)

  function LeagueCard({ league }: any) {
    return (
      <div className="flex items-center justify-between bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">{league.name}</h2>

          {league.description && (
            <p className="text-gray-700 mt-1">{league.description}</p>
          )}

          <p className="text-sm text-gray-600 mt-3">
            <strong>Draft:</strong> {new Date(league.draft_date).toLocaleString()} •{" "}
            <strong>Starts:</strong> {new Date(league.start_date).toLocaleDateString()} •{" "}
            <strong>Players:</strong> {league.num_users} / {league.max_users}
          </p>
        </div>

        {league.joined ? (
          <button
            onClick={() => leaveLeague(league.id)}
            className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition"
          >
            Leave
          </button>
        ) : league.locked ? (
          <button
            disabled
            className="bg-gray-300 text-gray-600 px-6 py-2 rounded-md cursor-not-allowed"
          >
            Locked
          </button>
        ) : (
          <button
            onClick={() => joinLeague(league.id)}
            className="bg-[#162a4a] text-white px-6 py-2 rounded-md hover:bg-[#1d355f] transition"
          >
            Join
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <GameTicker />
      <LoggedInNavBar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">Leagues</h1>

        {loading && <p>Loading leagues...</p>}

        {/* CURRENT LEAGUES */}
        {currentLeagues.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Your Leagues</h2>
            <div className="flex flex-col gap-6 mb-10">
              {currentLeagues.map((league) => (
                <LeagueCard key={league.id} league={league} />
              ))}
            </div>
          </>
        )}

        {/* AVAILABLE LEAGUES */}
        <h2 className="text-2xl font-semibold mb-4">Available Leagues</h2>
        <div className="flex flex-col gap-6 mb-10">
          {availableLeagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
          {availableLeagues.length === 0 && <p>No available leagues.</p>}
        </div>

        {/* LOCKED LEAGUES */}
        <h2 className="text-2xl font-semibold mb-4">Locked Leagues</h2>
        <div className="flex flex-col gap-6">
          {lockedLeagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
          {lockedLeagues.length === 0 && <p>No locked leagues.</p>}
        </div>
      </div>
    </>
  )
}
