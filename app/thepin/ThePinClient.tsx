"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import LoggedInNavBar from "@/components/LoggedInNavBar"
import NextMajorEvent from "@/components/NextMajorEvent"
import WelcomeModal from "@/components/WelcomeModal"

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

export default function ThePinClient() {
  const router = useRouter()
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [upcomingDrafts, setUpcomingDrafts] = useState<any[]>([])
  const nextDraft = upcomingDrafts[0] ?? null

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const welcome = params.get("welcome");

    if (welcome === "true") {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [params]);

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

      const { data: drafts } = await supabase
        .from("fantasy_events")
        .select(`
          id,
          name,
          draft_date,
          draft_status,
          fantasy_event_users!inner ( user_id )
        `)
        .eq("fantasy_event_users.user_id", userData.user.id)
        .in("draft_status", ["open", "closed"])
        .order("draft_date", { ascending: true })

      setUpcomingDrafts(drafts ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  return (
    <>
      {showModal && (
        <WelcomeModal
          onClose={() => setShowModal(false)}
          username={profile?.username}
        />
      )}

      <LoggedInNavBar />

      <div className="flex w-full max-w-[1450px] mx-auto gap-6 py-10 px-6 mt-0">
        {/* LEFT SIDEBAR */}
        <div className="w-1/5 flex flex-col gap-6">

          {/* CARD 1 — Curling Favorites */}
          <aside className="bg-white shadow-md p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Curling Favorites</h2>
            <ul className="space-y-2 text-gray-700">
              <li>
                <a
                  href="https://worldcurling.org"
                  target="_blank"
                  className="hover:underline hover:text-[#AA2B1D] transition"
                >
                  World Curling Federation ↗
                </a>
              </li>

              <li>
                <a
                  href="https://www.curlingzone.com"
                  target="_blank"
                  className="hover:underline hover:text-[#AA2B1D] transition"
                >
                  CurlingZone ↗
                </a>
              </li>

              <li>
                <a
                  href="https://curling.gg/"
                  target="_blank"
                  className="hover:underline hover:text-[#AA2B1D] transition"
                >
                  curling.gg ↗
                </a>
              </li>

              <li>
                <a
                  href="https://www.olympics.com/en/milano-cortina-2026/schedule/cur"
                  target="_blank"
                  className="hover:underline hover:text-[#AA2B1D] transition"
                >
                  2026 Milan Olympics ↗
                </a>
              </li>
            </ul>
          </aside>

          {/* CARD 2 — Next Major Event */}
          <div className="bg-white shadow-md p-4 rounded-lg">
            <NextMajorEvent />
          </div>

          {/* CARD 3 — Featured Image */}
          <div className="bg-white shadow-md p-4 rounded-lg">
            <img
              src="/webpage/featured-image.jpg"
              alt="Sidebar Image"
              className="w-full h-auto object-contain rounded-md"
            />
          </div>

        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-white shadow-md p-8 min-h-[500px] rounded-lg">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-4">Hi, {profile?.username}!</h1>
              <p className="text-gray-700 mb-6">Here’s what’s happening around the rings today.</p>

              {/* UPCOMING DRAFT CARD */}
              <div className="bg-blue-100 border border-blue-300 p-4 flex items-center justify-between rounded-lg">
                {/* LEFT SIDE */}
                <div>
                  <h2 className="text-lg font-semibold mb-1">Your Upcoming Draft</h2>

                  {!nextDraft ? (
                    <p className="text-gray-600">
                      No upcoming drafts - {" "}
                      <a href="/leagues" className="text-[#ac0000] underline">
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
                      {/* OPEN — Countdown and users can join or leave */}
                      {nextDraft.draft_status === "open" && (
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md"
                        >
                          Draft live in <Countdown target={new Date(nextDraft.draft_date)} />
                        </button>
                      )}

                      {/* CLOSED — Draft happening - enter draft */}
                      {nextDraft.draft_status === "closed" && (
                        <button
                          onClick={() => goToDraft(nextDraft.id)}
                          className="bg-[#1f4785] text-white px-4 py-2 rounded-md"
                        >
                          Enter Draft Room
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
