"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import Image from "next/image"
import BottomBar from "@/components/LoggedInBottomBar"

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const [leagues, setLeagues] = useState<any[]>([])

  const openLeagues = leagues.filter((l) => l.draft_status === "open")
  const inProgressLeagues = leagues.filter((l) => l.draft_status === "closed")
  const completedLeagues = leagues.filter((l) => l.draft_status === "completed")

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        router.replace("/thepin")
        return
      }
      setUser(null)
    }

    async function fetchLeagues() {
      const { data: leaguesData } = await supabase
        .from("fantasy_events")
        .select(`
          id,
          name,
          draft_status,
          draft_date,
          curling_event_id,
          curling_events ( name, year, location )
        `)
        .eq("is_public", true)
        .order("draft_date", { ascending: true })

      if (leaguesData) setLeagues(leaguesData)
    }

    checkUser()
    fetchLeagues()
  }, [router])

  return (
    <>
      <header className="relative w-full overflow-hidden">
        <div className="relative h-[520px] md:h-[600px] w-full">
          <Image
            src="/webpage/button-home-graphic.png"
            alt="Curling Hero"
            fill
            className="object-cover brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/70" />
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-4">
            <div className="mx-auto w-full max-w-6xl">
              <div className="flex flex-col items-center text-center text-white">
                <div className="relative w-[240px] h-[72px] sm:w-[280px] sm:h-[84px] md:w-[360px] md:h-[104px]">
                  <Image
                    src="/logos/button-main-logo.png"
                    alt="BUTTON logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow">
                  Fantasy Curling.
                  <span className="block">Built for Competitors.</span>
                </h1>

                <p className="mt-4 max-w-md text-sm sm:text-md md:text-lg text-white/90">
                  The first fantasy curling platform to draft players for national and international competitions.
                </p>

                <div className="mt-7 flex w-full max-w-xl flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => router.push("/signup")}
                    className="w-full bg-[#ac0000] text-white py-4 rounded-2xl text-lg font-semibold hover:bg-[#8a0000] transition shadow-lg"
                  >
                    Take Your Shot
                  </button>

                  <button
                    onClick={() => router.push("/login")}
                    className="w-full py-4 rounded-2xl text-lg font-semibold border border-white/70 text-white hover:bg-white hover:text-[#0a2342] transition shadow-lg"
                  >
                    Return to Your Rink
                  </button>
                </div>

                <p className="mt-5 text-xs sm:text-sm text-white/80">
                  Pick your curlers • Sweep the leaderboard • Hit the button
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full">
        <section className="px-4">
          <div className="mx-auto w-full max-w-6xl py-12 sm:py-16">
            <div className="text-center">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1f4785]">
                Step into the Hack and Play Fantasy Curling
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition transform md:hover:-translate-y-1 md:hover:shadow-2xl">
                <div className="relative w-full h-[72px] sm:h-[104px] md:h-[112px] flex items-center justify-center">
                  <Image
                    src="/webpage/join-a-league.png"
                    alt="Join or Create a League"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <h3 className="text-base sm:text-xl font-bold">Join or Create a League</h3>
                  <p className="mt-2 text-gray-700 text-xs sm:text-base">
                    Jump into public leagues or set up a private competition.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition transform md:hover:-translate-y-1 md:hover:shadow-2xl">
                <div className="relative w-full h-[72px] sm:h-[104px] md:h-[112px] flex items-center justify-center">
                  <Image
                    src="/webpage/draft-your-rink.png"
                    alt="Draft Your Rink"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-bold">Draft Your Rink</h3>
                  <p className="mt-2 text-gray-700 text-xs sm:text-base">
                    Pick curlers from national and international competitions. 
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition transform md:hover:-translate-y-1 md:hover:shadow-2xl">
                <div className="relative w-full h-[72px] sm:h-[104px] md:h-[112px] flex items-center justify-center">
                  <Image
                    src="/webpage/score-points.png"
                    alt="Score Points"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-bold">Score Points</h3>
                  <p className="mt-2 text-gray-700 text-xs sm:text-base">
                    Earn points based on real-world performance. 
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition transform md:hover:-translate-y-1 md:hover:shadow-2xl">
                <div className="relative w-full h-[72px] sm:h-[104px] md:h-[112px] flex items-center justify-center">
                  <Image
                    src="/webpage/collect-pins.png"
                    alt="Collect Pins"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-bold">Collect Pins</h3>
                  <p className="mt-2 text-gray-700 text-xs sm:text-base">
                    Unlock achievements and show off your status.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4">
          <div className="mx-auto w-full max-w-6xl pb-12">
            <div className="bg-[#0a2342] text-white rounded-2xl shadow-inner px-6 sm:px-10 py-10 sm:py-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-center">How Scoring Works</h2>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 border border-white/10 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-bold">Individual Performance</h3>
                  <p className="mt-2 text-white/80">
                    Players earn points based on their shooting percentage and how their performance 
                    compares to both their team and their opponent.
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-bold">Position Matters</h3>
                  <p className="mt-2 text-white/80">
                    Because skips face more difficult shots, their scoring carries extra weight compared to other positions.
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-bold">Game Impact</h3>
                  <p className="mt-2 text-white/80">
                    Wins and score differentials add small bonuses to reflect real match outcomes.
                  </p>
                </div>
              </div>

              <p className="mt-8 text-center text-sm text-white/80">
                A full scoring breakdown is available on the{" "}
                <a
                  href="/howitworks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-200 transition"
                >
                  How It Works
                </a>{" "}
                page.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4">
          <div className="mx-auto w-full max-w-6xl py-12">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1f4785]">
                Collect Pins to Show Your Status
              </h2>
              <p className="mt-3 text-gray-700 max-w-3xl mx-auto">
                Earn achievements for finishes, event dominance, and perfect performances.
              </p>
            </div>

            <div className="mt-8 mx-2 px-4 flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-6 sm:overflow-visible">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-[180px] flex-none snap-start sm:w-auto transition transform md:hover:-translate-y-1 md:hover:shadow-2xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center min-h-[210px]">
                  <div className="w-16 h-16 relative mb-4">
                    <Image src="/icons/four-foot-finisher.png" alt="Four Foot Finisher" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Four Foot Finisher</p>
                  <p className="mt-2 text-xs text-gray-600">You're golden! Finish first in a league of at least eight.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-[180px] flex-none snap-start sm:w-auto transition transform md:hover:-translate-y-1 md:hover:shadow-2xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center min-h-[210px]">
                  <div className="w-16 h-16 relative mb-4">
                    <Image src="/icons/eight-foot-finisher.png" alt="Eight Foot Finisher" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Eight Foot Finisher</p>
                  <p className="mt-2 text-xs text-gray-600">Silver looks good on you! Finish second in a league of at least eight.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-[180px] flex-none snap-start sm:w-auto transition transform md:hover:-translate-y-1 md:hover:shadow-2xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center min-h-[210px]">
                  <div className="w-16 h-16 relative mb-4">
                    <Image src="/icons/twelve-foot-finisher.png" alt="Twelve Foot Finisher" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Twelve Foot Finisher</p>
                  <p className="mt-2 text-xs text-gray-600">Hitting the rings and the podium! Finish third in a league of at least eight.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-[180px] flex-none snap-start sm:w-auto transition transform md:hover:-translate-y-1 md:hover:shadow-2xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center min-h-[210px]">
                  <div className="w-16 h-16 relative mb-4">
                    <Image src="/icons/first-event-winner.png" alt="First Event Winner" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">First Event Winner</p>
                  <p className="mt-2 text-xs text-gray-600">Your picks were world-class! Each one led their position in fantasy points.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-[180px] flex-none snap-start sm:w-auto transition transform md:hover:-translate-y-1 md:hover:shadow-2xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center min-h-[210px]">
                  <div className="w-16 h-16 relative mb-4">
                    <Image src="/icons/second-event-winner.png" alt="Second Event Winner" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Second Event Winner</p>
                  <p className="mt-2 text-xs text-gray-600">Your picks held their own! Each landed second in fantasy points at their positions.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-[180px] flex-none snap-start sm:w-auto transition transform md:hover:-translate-y-1 md:hover:shadow-2xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center min-h-[210px]">
                  <div className="w-16 h-16 relative mb-4">
                    <Image src="/icons/clean-sweep.png" alt="Clean Sweep" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Clean Sweep</p>
                  <p className="mt-2 text-xs text-gray-600">Your pick delivered a perfect game! A true clean sweep.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="bg-[#0a2342] text-white rounded-2xl shadow-inner px-6 sm:px-10 py-10">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl sm:text-4xl font-extrabold">Public Leagues Happening Right Now</h2>
                <p className="text-white/80">Jump in, draft, and start scoring points.</p>
              </div>

              <div className="mt-10 flex flex-col gap-10">
                <div>
                  <p className="text-lg font-extrabold mb-4">Open Drafts</p>

                  <div className="flex flex-col gap-4">
                    {openLeagues.slice(0, 3).map((league) => (
                      <div
                        key={league.id}
                        className="bg-white/10 border border-white/10 rounded-xl p-5"
                      >
                        <div className="flex flex-col gap-4 sm:gap-0 sm:flex-row sm:items-end sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-2xl font-extrabold leading-tight break-words">
                              {league.name}
                            </p>
                            <p className="mt-2 text-sm sm:text-base text-white/80">
                              {league.curling_events?.year} {league.curling_events?.name}
                              {league.curling_events?.location ? ` • ${league.curling_events.location}` : ""}
                            </p>
                          </div>

                          <button
                            onClick={() => router.push(`/login`)}
                            className="shrink-0 sm:ml-6 bg-[#ac0000] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#8a0000] transition"
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    ))}

                    {openLeagues.length === 0 && (
                      <p className="text-white/70">No open drafts right now.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-lg font-extrabold mb-4">In Progress</p>

                  <div className="flex flex-col gap-4">
                    {inProgressLeagues.slice(0, 3).map((league) => (
                      <div
                        key={league.id}
                        className="bg-white/10 border border-white/10 rounded-xl p-5"
                      >
                        <div className="flex flex-col gap-4 sm:gap-0 sm:flex-row sm:items-end sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-2xl font-extrabold leading-tight break-words">
                              {league.name}
                            </p>
                            <p className="mt-2 text-sm sm:text-base text-white/80">
                              {league.curling_events?.year} {league.curling_events?.name}
                              {league.curling_events?.location ? ` • ${league.curling_events.location}` : ""}
                            </p>
                          </div>

                          <button
                            onClick={() => router.push(`/login`)}
                            className="shrink-0 sm:ml-6 border border-white/60 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-white hover:text-[#0a2342] transition"
                          >
                            View Standings
                          </button>
                        </div>
                      </div>
                    ))}

                    {inProgressLeagues.length === 0 && (
                      <p className="text-white/70">No leagues in progress right now.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-lg font-extrabold mb-4">Completed</p>

                  <div className="flex flex-col gap-4">
                    {completedLeagues.slice(0, 3).map((league) => (
                      <div
                        key={league.id}
                        className="bg-white/10 border border-white/10 rounded-xl p-5"
                      >
                        <div className="flex flex-col gap-4 sm:gap-0 sm:flex-row sm:items-end sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-2xl font-extrabold leading-tight break-words">
                              {league.name}
                            </p>
                            <p className="mt-2 text-sm sm:text-base text-white/80">
                              {league.curling_events?.year} {league.curling_events?.name}
                              {league.curling_events?.location ? ` • ${league.curling_events.location}` : ""}
                            </p>
                          </div>

                          <button
                            onClick={() => router.push(`/login`)}
                            className="shrink-0 sm:ml-6 border border-white/60 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-white hover:text-[#0a2342] transition"
                          >
                            View Results
                          </button>
                        </div>
                      </div>
                    ))}

                    {completedLeagues.length === 0 && (
                      <p className="text-white/70">No completed leagues yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="mx-auto w-full max-w-6xl">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 sm:p-12 text-center">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-[#1f4785]">Ready to Build Your Rink?</h2>

              <p className="mt-4 text-gray-700 text-base sm:text-lg max-w-3xl mx-auto">
                Draft teams, compete in leagues, and track real-world performance all season long.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <a
                  href="/signup"
                  className="inline-flex justify-center bg-[#ac0000] text-white text-lg font-semibold py-3 px-8 rounded-xl hover:bg-[#8a0000] transition"
                >
                  Get Started
                </a>
                <a
                  href="/howitworks"
                  className="inline-flex justify-center border border-[#1f4785] text-[#1f4785] text-lg font-semibold py-3 px-8 rounded-xl hover:bg-[#1f4785] hover:text-white transition"
                >
                  See How It Works
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomBar />
    </>
  )

}
