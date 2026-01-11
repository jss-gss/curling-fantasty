"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"
import NextMajorEvent from "@/components/NextMajorEvent"

function Countdown({ target }: { target: Date }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = target.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("00:00:00")
        clearInterval(interval)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [target])

  return <span>{timeLeft}</span>
}

export default function DashboardHome() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [upcomingDrafts, setUpcomingDrafts] = useState<any[]>([])
  const nextDraft = upcomingDrafts[0] ?? null

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

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()
      setProfile(profileData)

      // Load upcoming drafts (locked leagues the user is in)
      const { data: drafts } = await supabase
        .from("fantasy_events")
        .select(`
          id,
          name,
          draft_date,
          status,
          fantasy_event_users!inner ( user_id )
        `)
        .eq("fantasy_event_users.user_id", userData.user.id)
        .eq("status", "locked")
        .order("draft_date", { ascending: true })

      setUpcomingDrafts(drafts ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  return (
    <>
      <GameTicker />
      <LoggedInNavBar />

      <div className="flex w-full max-w-7xl ml-12 gap-6 py-10 px-6 mt-0">
        {/* LEFT SIDEBAR */}
        <div className="w-1/5 flex flex-col gap-6">
          <aside className="bg-white shadow-md p-4 h-fit sticky top-24">
            <h2 className="text-xl font-semibold mb-3">Curling Favorites</h2>
            <ul className="space-y-2 text-gray-700">
              <li><a href="https://worldcurling.org" target="_blank">World Curling Federation ↗</a></li>
              <li><a href="https://www.curlingzone.com" target="_blank">CurlingZone ↗</a></li>
              <li><a href="https://www.curling.ca/2026scotties" target="_blank">2026 Scotties TOH ↗</a></li>
              <li><a href="https://www.olympics.com/en/milano-cortina-2026/schedule/cur" target="_blank">2026 Milan Olympics ↗</a></li>
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
              <h1 className="text-3xl font-bold mb-4">Welcome back, Hustler.</h1>
              <p className="text-gray-700 mb-6">Here’s what’s happening around the rings today.</p>

              {/* League Update */}
              <div className="bg-blue-100 border border-blue-300 p-4 mb-6">
                <h3 className="text-lg font-semibold mb-2">League Update</h3>
                <p className="text-gray-700">
                  New events have been added. Make sure to submit your picks before the deadline.
                </p>
              </div>

              {/* UPCOMING DRAFT CARD */}
              <div className="bg-white p-4 flex items-center justify-between">
                {/* LEFT SIDE */}
                <div>
                  <h2 className="text-lg font-semibold mb-1">Your Upcoming Drafts</h2>

                  {!nextDraft ? (
                    <p className="text-gray-600">
                      No upcoming drafts - {" "}
                      <a href="/league" className="text-[#ac0000] underline">
                        find a league
                      </a>
                    </p>
                  ) : (
                    <p className="text-gray-700">{nextDraft.name}</p>
                  )}
                </div>

                {/* RIGHT SIDE */}
                <div>
                  {nextDraft && (
                    <>
                      {nextDraft.status === "locked" && (
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md"
                        >
                          Draft Locked —{" "}
                          <Countdown target={new Date(nextDraft.draft_date)} />
                        </button>
                      )}

                      {nextDraft.status === "open" && (
                        <button
                          onClick={() => goToDraft(nextDraft.id)}
                          className="bg-[#1f4785] text-white px-4 py-2 rounded-md"
                        >
                          Join Draft Room
                        </button>
                      )}

                      {nextDraft.status === "closed" && (
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md"
                        >
                          Draft Closed — Waiting for Event Start
                        </button>
                      )}

                      {nextDraft.status === "archived" && (
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md"
                        >
                          Event Finished — Archived
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
