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

      const { data: leagueData } = await supabase
        .from("fantasy_events")
        .select(`
          *,
          curling_events:curling_events(*),
          fantasy_event_users ( user_id )
        `)
        .order("draft_date", { ascending: true })

      if (!leagueData) {
        setLeagues([])
        setLoading(false)
        return
      }

      const processed = leagueData.map((l) => ({
        ...l,
        enrolled: l.fantasy_event_users?.some(
          (u: any) => u.user_id === userData.user.id
        ),
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

    setLeagues((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              enrolled: true,
              fantasy_event_users: [
                ...(l.fantasy_event_users ?? []),
                { user_id: user.id },
              ],
            }
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

    setLeagues((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              enrolled: false,
              fantasy_event_users: l.fantasy_event_users?.filter(
                (u: any) => u.user_id !== user.id
              ),
            }
          : l
      )
    )
  }

  const myLeagues = leagues.filter((l) => l.enrolled)
  const notMyLeagues = leagues.filter((l) => !l.enrolled)

  const myActiveLeagues = myLeagues.filter((l) => l.draft_status === "locked")

  const myUpcomingDrafts = myLeagues.filter(
    (l) => l.draft_status === "open" || l.draft_status === "closed"
  )

  const findAvailableLeagues = notMyLeagues.filter(
    (l) =>
      (l.draft_status === "open" || l.draft_status === "closed") &&
      (l.fantasy_event_users?.length ?? 0) < l.max_users
  )

  const findClosedLeagues = notMyLeagues.filter((l) =>
    l.draft_status === "locked" ||
    l.draft_status === "archived" ||
    (
      (l.draft_status === "open" || l.draft_status === "closed") &&
      (l.fantasy_event_users?.length ?? 0) >= l.max_users
    )
  )

  function LeagueCard({ league }: any) {
    const isFull = (league.fantasy_event_users?.length ?? 0) >= league.max_users
    const isJoinable =
      (league.draft_status === "open" || league.draft_status === "closed") &&
      !isFull

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
              ? new Date(league.curling_events.start_date).toLocaleDateString()
              : "TBD"}{" "}
            • <strong>Players:</strong> {league.fantasy_event_users.length} / {league.max_users}
          </p>
        </div>

        {/* BUTTON LOGIC */}
        {league.enrolled ? (
          league.draft_status === "closed" ? (
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-6 py-2 rounded-md cursor-not-allowed"
            >
              Draft In Progress
            </button>
          ) : league.draft_status === "locked" ? (
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-6 py-2 rounded-md cursor-not-allowed"
            >
              Event Live
            </button>
          ) : league.draft_status === "archived" ? (
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-6 py-2 rounded-md cursor-not-allowed"
            >
              Archived
            </button>
          ) : (
            <button
              onClick={() => leaveLeague(league.id)}
              className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition"
            >
              Leave
            </button>
          )
        ) : isFull || league.draft_status === "closed" ? (
          <button
            disabled
            className="bg-gray-300 text-gray-600 px-6 py-2 rounded-md cursor-not-allowed"
          >
            Closed
          </button>
        ) : (
          <button
            disabled={!isJoinable}
            onClick={() => isJoinable && joinLeague(league.id)}
            className={`px-4 py-2 rounded-md text-white ${
              isJoinable
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isFull ? "Full" : "Join"}
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
        <h1 className="text-3xl font-bold mb-8">Leagues</h1>

        {loading && <p>Loading leagues...</p>}

        {/* MY LEAGUES */}
        <h2 className="text-2xl font-semibold mb-4">My Leagues</h2>

        {/* Active */}
        <h3 className="text-xl font-semibold mb-2">Active Leagues</h3>
        <div className="flex flex-col gap-6 mb-8">
          {myActiveLeagues.length > 0 ? (
            myActiveLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))
          ) : (
            <p className="text-gray-600">No active leagues.</p>
          )}
        </div>

        {/* Upcoming Drafts */}
        <h3 className="text-xl font-semibold mb-2">Upcoming Drafts</h3>
        <div className="flex flex-col gap-6 mb-12">
          {myUpcomingDrafts.length > 0 ? (
            myUpcomingDrafts.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))
          ) : (
            <p className="text-gray-600">No upcoming drafts.</p>
          )}
        </div>

        {/* FIND A LEAGUE */}
        <h2 className="text-2xl font-semibold mb-4">Find a League</h2>

        {/* Available */}
        <h3 className="text-xl font-semibold mb-2">Available Leagues</h3>
        <div className="flex flex-col gap-6 mb-8">
          {findAvailableLeagues.length > 0 ? (
            findAvailableLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))
          ) : (
            <p className="text-gray-600">No leagues available.</p>
          )}
        </div>

        {/* Closed / Full */}
        <h3 className="text-xl font-semibold mb-2">Closed / Full Leagues</h3>
        <div className="flex flex-col gap-6">
          {findClosedLeagues.length > 0 ? (
            findClosedLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))
          ) : (
            <p className="text-gray-600">No closed leagues.</p>
          )}
        </div>
      </div>
    </>
  )
}
