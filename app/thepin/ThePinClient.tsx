"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter, useSearchParams } from "next/navigation"
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
  const params = useSearchParams()

  const [user, setUser] = useState<User | null>(null)
  const [dismissedInvites, setDismissedInvites] = useState<string[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingDrafts, setUpcomingDrafts] = useState<any[]>([])
  const nextDraft = upcomingDrafts[0] ?? null
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const welcome = params.get("welcome")
    if (welcome === "true") {
      const timer = setTimeout(() => setShowModal(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [params])

  function goToDraft(slug: string) {
    router.push(`/draft/${slug}`)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const res = await fetch("/api/check-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      })

      const auth = await res.json()
      if (!auth.allowed) {
        router.push("/login")
        return
      }

      setUser(user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setProfile(profileData)

      const { data: drafts } = await supabase
        .from("fantasy_events")
        .select(`
          id,
          slug,
          name,
          description,
          draft_date,
          draft_status,
          max_users,
          created_by,
          sender:profiles!fantasy_events_created_by_fkey (
            id,
            username,
            avatar_url,
            is_public
          ),
          users:profiles ( id, username, is_public ),
          curling_events ( * ),
          fantasy_event_users!inner ( user_id )
        `)
        .eq("fantasy_event_users.user_id", user.id)
        .in("draft_status", ["open", "closed"])
        .order("draft_date", { ascending: true })

      const processedDrafts = (drafts ?? [])
        .filter(Boolean)
        .map(d => ({
          ...d,
          is_commissioner: d.created_by === user.id
        }))

      setUpcomingDrafts(processedDrafts)

      const { data: leagueData } = await supabase
        .from("fantasy_events")
        .select(`
          *,
          sender:profiles!fantasy_events_created_by_fkey (
            id,
            username,
            avatar_url,
            is_public
          ),
          fantasy_event_users ( user_id ),
          fantasy_event_user_invites ( id, user_id )
        `)

      if (leagueData) {
        const processedLeagues = leagueData
          .filter(Boolean)
          .map((l: any) => ({
            ...l,
            enrolled: l.fantasy_event_users?.some(
              (u: { user_id: string }) => u.user_id === user.id
            ),
            invited: l.fantasy_event_user_invites?.some(
              (inv: { user_id: string }) => inv.user_id === user.id
            ),
            is_commissioner: l.created_by === user.id
          }))

        setLeagues(processedLeagues)
      }

      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    const stored = localStorage.getItem("dismissedInvites")
    if (stored) {
      setDismissedInvites(JSON.parse(stored))
    }
  }, [])

  function dismissInvite(inviteId: string) {
    const updated = [...dismissedInvites, inviteId]
    setDismissedInvites(updated)
    localStorage.setItem("dismissedInvites", JSON.stringify(updated))
  }

  const privateInvites = leagues.filter(l => {
    const invite = l.fantasy_event_user_invites?.find(
      (inv: { id: string; user_id: string }) => inv.user_id === user?.id
    )
    if (!invite) return false
    if (dismissedInvites.includes(invite.id)) return false
    if (l.enrolled) return false
    if (l.created_by === user?.id) return false
    if (l.is_public) return false
    if (l.draft_status !== "open") return false
    return true
  })

  return (
    <>
      <div
        className="w-full min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/webpage/pin-page.png')" }}
      >
        {showModal && (
          <WelcomeModal
            onClose={() => setShowModal(false)}
            username={profile?.username}
          />
        )}

        <LoggedInNavBar />

        <div className="flex w-full max-w-[1450px] mx-auto gap-6 py-10 px-6">
          <aside className="w-1/5 flex flex-col gap-6">
            <div className="bg-white shadow-md p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-3">Curling Favorites</h2>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <a
                    href="https://worldcurling.org"
                    target="_blank"
                    className="hover:text-[#AA2B1D] underline"
                  >
                    World Curling Federation ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.curlingzone.com"
                    target="_blank"
                    className="hover:text-[#AA2B1D] underline"
                  >
                    CurlingZone ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://curling.gg/"
                    target="_blank"
                    className="hover:text-[#AA2B1D] underline"
                  >
                    curling.gg ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.olympics.com/en/milano-cortina-2026/schedule/cur"
                    target="_blank"
                    className="hover:text-[#AA2B1D] underline"
                  >
                    2026 Milan Olympics ↗
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-white shadow-md p-4 rounded-lg">
              <NextMajorEvent />
            </div>

            <div className="bg-white shadow-md p-4 rounded-lg">
              <img
                src="/webpage/featured-image.jpg"
                alt="Sidebar Image"
                className="w-full h-auto object-contain rounded-md"
              />
            </div>
          </aside>

          <div className="flex flex-col flex-1 justify-between">
            <main className="bg-white shadow-md p-8 rounded-lg flex-grow">
              {loading ? (
                <p className="w-full flex justify-center mt-20 text-gray-600">
                  Loading...
                </p>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-4">
                    Hi, {profile?.username}!
                  </h1>
                  <p className="text-gray-700 mb-6">
                    Here’s what’s happening around the rings today.
                  </p>

                  {privateInvites.length > 0 && (
                    <div className="mb-6">
                      <div className="space-y-4">
                        {privateInvites.map(league => {
                          const invite = league.fantasy_event_user_invites.find(
                            (inv: { id: string; user_id: string }) =>
                              inv.user_id === user?.id
                          )

                          return (
                            <div
                              key={league.id}
                              className="p-5 rounded-lg bg-blue-50 border border-blue-200 flex justify-between items-start"
                            >
                              <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-bold text-blue-900">
                                  You’ve been invited!
                                </h2>
                                <p className="text-sm text-gray-700">
                                  Join{" "}
                                  <span className="font-semibold">
                                    {league.name}
                                  </span>{" "}
                                  – a private league created by{" "}
                                  {league.sender?.is_public ? (
                                    <span
                                      onClick={() =>
                                        router.push(
                                          `/profile/${league.sender.username}`
                                        )
                                      }
                                      className="font-semibold text-blue-700 cursor-pointer hover:underline"
                                    >
                                      {league.sender.username}
                                    </span>
                                  ) : (
                                    <span className="font-semibold">
                                      {league.sender?.username ?? "someone"}
                                    </span>
                                  )}
                                  .
                                </p>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => dismissInvite(invite.id)}
                                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                                  aria-label="Ignore invite"
                                >
                                  ×
                                </button>

                                <button
                                  onClick={() =>
                                    router.push(`/league/${league.slug}`)
                                  }
                                  className="bg-[#1f4785] text-white px-4 py-2 rounded-md hover:bg-[#163766] transition text-sm"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <section>
                    {!nextDraft && (
                      <p className="text-gray-600">
                        No upcoming drafts –{" "}
                        <a
                          href="/leagueplay"
                          className="text-[#ac0000] underline"
                        >
                          find a league
                        </a>
                      </p>
                    )}
                  </section>
                </>
              )}
            </main>

            {nextDraft && (
              <div className="bg-white shadow-md p-6 rounded-lg mt-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    Your Upcoming Draft on{" "}
                    {new Date(nextDraft.draft_date).toLocaleString("en-US", {
                      timeZone: "America/New_York",
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}{" "}
                    ET
                  </h2>

                  <div className="flex items-center gap-2">
                    <h3 className="text-md mt-1 font-semibold">
                      {nextDraft.name}
                    </h3>

                    {nextDraft.is_public ? (
                      <span className="text-xs mt-2 font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        public
                      </span>
                    ) : (
                      <span className="text-xs mt-2 font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                        private
                      </span>
                    )}

                    {nextDraft.is_commissioner && (
                      <span className="text-xs mt-2 font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                        draw master
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray mt-2 italic">
                    {nextDraft.description}
                  </p>
                </div>

                {nextDraft.draft_status === "open" && (
                  <button
                    disabled
                    className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md"
                  >
                    Draft live in{" "}
                    <Countdown target={new Date(nextDraft.draft_date)} />
                  </button>
                )}

                {nextDraft.draft_status === "closed" && (
                  <button
                    onClick={() => goToDraft(nextDraft.slug)}
                    className="bg-[#1f4785] text-white px-4 py-2 rounded-md"
                  >
                    Enter Draft Room
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
