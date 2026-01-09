"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeagues() {
      const { data, error } = await supabase
        .from("fantasy_events")
        .select("*")
        .order("start_date", { ascending: true })

      if (!error && data) setLeagues(data)
      setLoading(false)
    }

    loadLeagues()
  }, [])

  async function joinLeague(id: string) {
    alert("Joining league: " + id)
  }

  return (
    <>
      <GameTicker />
      <LoggedInNavBar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        <h1 className="text-3xl font-bold mb-6">Available Leagues</h1>

        {loading && <p>Loading leagues...</p>}

        <div className="flex flex-col gap-6">
        {leagues.map((league) => (
            <div
            key={league.id}
            className="flex items-center justify-between bg-white shadow-md rounded-lg p-6 border border-gray-200"
            >
            <div className="flex flex-col">
                <h2 className="text-xl font-semibold">{league.name}</h2>

                {league.description && (
                <p className="text-gray-700 mt-1">{league.description}</p>
                )}

                <div className="text-sm text-gray-600 space-y-1 mt-3">
                <p>
                    <strong>Draft:</strong>{" "}
                    {new Date(league.draft_date).toLocaleString()}
                </p>
                <p>
                    <strong>Starts:</strong>{" "}
                    {new Date(league.start_date).toLocaleDateString()}
                </p>
                <p>
                    <strong>Players:</strong>{" "}
                    {league.num_users} / {league.max_users}
                </p>
                </div>
            </div>

            <button
                onClick={() => joinLeague(league.id)}
                className="bg-[#162a4a] text-white px-6 py-2 rounded-md hover:bg-[#1d355f] transition"
            >
                Join
            </button>
            </div>
        ))}
        </div>

        {!loading && leagues.length === 0 && (
          <p className="text-gray-600 mt-6">No leagues available right now.</p>
        )}
      </div>
    </>
  )
}
