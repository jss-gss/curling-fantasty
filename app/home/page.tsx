"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"
import NextMajorEvent from "@/components/NextMajorEvent"

export default function DashboardHome() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [fantasyEventId, setFantasyEventId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function startDraft(eventId: string) {
    await fetch("/api/startDraft", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    })

    router.push(`/draft/${eventId}`)
  }

  function goToDraft(eventId: string) {
    router.push(`/draft/${eventId}`)
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/login")
        return
      }

      setUser(userData.user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      setProfile(profileData)

      // Load the user's league
      const { data: league } = await supabase
        .from("fantasy_event_users")
        .select("fantasy_event_id")
        .eq("user_id", userData.user.id)
        .single()

      setFantasyEventId(league?.fantasy_event_id ?? null)

      setLoading(false)
    }

    load()
  }, [router])

  const displayName =
    profile?.username ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    user?.email

  return (
    <>
      <GameTicker />
      <LoggedInNavBar />

      <div className="flex w-full max-w-7xl ml-12 gap-6 py-10 px-6 mt-0">

        {/* LEFT SIDEBAR — ALWAYS RENDERS */}
        <div className="w-1/5 flex flex-col gap-6">
          <aside className="bg-white shadow-md p-4 h-fit sticky top-24">
            <h2 className="text-xl font-semibold mb-3">Curling Favorites</h2>

            <ul className="space-y-2 text-gray-700">
              <li><a href="https://worldcurling.org" target="_blank" rel="noopener noreferrer">World Curling Federation ↗</a></li>
              <li><a href="https://www.curlingzone.com" target="_blank" rel="noopener noreferrer">CurlingZone ↗</a></li>
              <li><a href="https://www.curling.ca/2026scotties" target="_blank" rel="noopener noreferrer">2026 Scotties TOH ↗</a></li>
              <li><a href="https://www.olympics.com/en/milano-cortina-2026/schedule/cur" target="_blank" rel="noopener noreferrer">2026 Milan Olympics ↗</a></li>
            </ul>
          </aside>

          <div className="w-full">
            <NextMajorEvent /> 
          </div>
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-white shadow-md p-8 min-h-[500px]">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-4">
                Welcome back, Hustler.
              </h1>

              <p className="text-gray-700 mb-6">
                Here’s what’s happening around the rings today.
              </p>

              <div className="bg-blue-100 border border-blue-300 p-4">
                <h3 className="text-lg font-semibold mb-2">League Update</h3>
                <p className="text-gray-700">
                  New events have been added. Make sure to submit your picks before the deadline.
                </p>
              </div>

              {/* DRAFT BUTTONS */}
              <div className="mt-6">
                <button
                  disabled={!fantasyEventId}
                  onClick={() => fantasyEventId && startDraft(fantasyEventId)}
                  className="bg-[#162a4a] text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  Start Draft
                </button>

                <button
                  disabled={!fantasyEventId}
                  onClick={() => fantasyEventId && goToDraft(fantasyEventId)}
                  className="bg-gray-200 px-4 py-2 rounded-md ml-4 disabled:opacity-50"
                >
                  Go to Draft Room
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
