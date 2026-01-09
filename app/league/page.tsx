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

      // Load leagues WITH curling event info
      const { data: leagueData } = await supabase
        .from("fantasy_events")
        .select(`
          *,
          curling_events:curling_events(*)
        `)
        .order("draft_date", { ascending: true })

      if (!leagueData) {
        setLeagues([])
        setLoading(false)
        return
      }

      const leagueIds = leagueData.map((l) => l.id)

      // Load memberships for this user
      const { data: memberships } = await supabase
        .from("fantasy_event_users")
        .select("fantasy_event_id")
        .eq("user_id", userData.user.id)
        .in("fantasy_event_id", leagueIds)

      const enrolledSet = new Set(
        memberships?.map((m) => m.fantasy_event_id)
      )

      // Merge status + enrollment
      const processed = leagueData.map((l) => ({
        ...l,
        enrolled: enrolledSet.has(l.id),
      }))

      setLeagues(processed)
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
          ? { ...l, enrolled: true, num_users: l.num_users + 1 }
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
          ? { ...l, enrolled: false, num_users: l.num_users - 1 }
          : l
      )
    )
  }

  // FILTERS
  const yourLeagues = leagues.filter((l) => l.enrolled)
  const availableLeagues = leagues.filter(
    (l) => !l.enrolled && l.status === "open"
  )
  const lockedLeagues = leagues.filter(
    (l) => !l.enrolled && l.status === "closed"
  )

  function LeagueCard({ league }: any) {
    return (
      <div className="flex items-center justify-between bg-white shadow-md rounded-lg p-6 border border-gray-200">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">{league.name}</h2>

          {league.description && (
            <p className="text-gray-700 mt-1">{league.description}</p>
          )}

          <p className="text-sm text-gray-600 mt-3">
            <strong>Draft:</strong>{" "}
            {new Date(league.draft_date).toLocaleString()} •{" "}
            <strong>Starts:</strong>{" "}
            {league.curling_events
              ? new Date(
                  league.curling_events.start_date
                ).toLocaleDateString()
              : "TBD"}{" "}
            • <strong>Players:</strong> {league.num_users} /{" "}
            {league.max_users}
          </p>
        </div>

        {league.enrolled ? (
          <button
            onClick={() => leaveLeague(league.id)}
            className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition"
          >
            Leave
          </button>
        ) : league.status === "closed" ? (
          <button
            disabled
            className="bg-gray-300 text-gray-600 px-6 py-2 rounded-md cursor-not-allowed"
          >
            Closed
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

        {/* YOUR LEAGUES */}
        {yourLeagues.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Your Leagues</h2>
            <div className="flex flex-col gap-6 mb-10">
              {yourLeagues.map((league) => (
                <LeagueCard key={league.id} league={league} />
              ))}
            </div>
          </>
        )}

        {/* AVAILABLE */}
        <h2 className="text-2xl font-semibold mb-4">Available Leagues</h2>
        <div className="flex flex-col gap-6 mb-10">
          {availableLeagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
          {availableLeagues.length === 0 && <p>No available leagues.</p>}
        </div>

        {/* LOCKED */}
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
