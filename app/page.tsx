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
      {/* FULL-WIDTH HERO */}
      <section className="relative w-full mb-20">

        {/* Background graphic */}
        <div className="relative h-[300px] md:h-[380px] w-full overflow-hidden">
          <Image
            src="/webpage/button-home-graphic.png"
            alt="Curling Hero"
            fill
            className="object-cover brightness-75"
          />
        </div>

      {/* Overlay content */}
      <div className="absolute inset-0 flex justify-center items-center text-white px-4">

        <div className="w-full flex flex-col items-center">
          {/* Inline row that spans the full hero width */}
          <div className="flex items-center gap-6 w-full justify-center whitespace-nowrap">
            <div className="relative flex-shrink-0">
              <div className="w-56 h-20 relative">
                <Image
                  src="/logos/button-main-logo.png"
                  alt="BUTTON logo"
                  fill
                  className="object-contain"
                />
              </div>

              <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-5xl font-extrabold">
                .
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg whitespace-nowrap">
              Fantasy Curling. Built for Competitors.
            </h1>
          </div>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl opacity-90 mt-4 text-center">
            Pick your curlers. Sweep the leaderboard. Hit the button.
          </p>

        </div>
      </div>
      </section>

      <main className="w-full flex flex-col items-center text-center px-3">
        {/* FULL-WIDTH PROMO CARD */}
        <section className="w-full max-w-5xl mb-25">
          <div className="0 text-left">
            <h2 className="text-3xl font-bold text-center text-[#1f4785] mb-3">
              Step into the Hack and Play Fantasy Curling
            </h2>
            <p className="text-gray-700 text-lg text-center mb-6">
              The first fantasy curling league to draft players for national and international competitions.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push("/signup")}
                className="bg-[#ac0000] text-white px-10 py-3 rounded-lg text-lg font-semibold hover:bg-[#8a0000] transition"
              >
                Take Your Shot
              </button>

              <button
                onClick={() => router.push("/login")}
                className="px-10 py-3 rounded-lg text-lg font-semibold border border-[#1f4785] text-[#1f4785] hover:bg-[#1f4785] hover:text-white transition"
              >
                Return to Your Rink
              </button>
            </div>
          </div>
        </section>

        {/* FEATURE CARDS */}
        <section className="w-full max-w-6xl mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Card 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-left transition transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/join-a-league.png"
                  alt="Draft Your Rinks"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Join or Create a League</h3>
              <p className="text-gray-700 text-center">
                Join public leagues or create your own private competition.
              </p>
            </div>

            {/* Card 2 */}
           <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-left transition transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/draft-your-rink.png"
                  alt="Draft Your Rinks"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-center">Draft Your Rink</h3>
              <p className="text-gray-700 text-center">
                Pick curlers from national and international events.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-left transition transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="w-full mb-4 ">
                <Image
                  src="/webpage/score-points.png"
                  alt="Score Points"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>

              <h3 className="text-xl font-semibold mb-2 text-center">Score Points</h3>
              <p className="text-gray-700 text-center">
                Earn points based on real‑world performance.
              </p>
            </div>
          </div>
        </section>
        
        {/* HOW SCORING WORKS */}
        <section className="w-full flex justify-center mb-20">
          <div className="w-full max-w-6xl bg-[#0a2342] text-white py-12 px-8 rounded-xl shadow-inner">

            <h2 className="text-3xl font-bold mb-10 text-center">
              How Scoring Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Individual Performance */}
              <div className="bg-[#12345a] p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-semibold mb-3">Individual Performance</h3>
                <p className="opacity-80">
                  Players earn points based on their shooting percentage and how they
                  perform compared to their team.
                </p>
              </div>

              {/* Position Matters */}
              <div className="bg-[#12345a] p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-semibold mb-3">Position Matters</h3>
                <p className="opacity-80">
                  Skips face tougher shots, so their scoring is weighted more heavily
                  than other positions.
                </p>
              </div>

              {/* Game Impact */}
              <div className="bg-[#12345a] p-6 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-semibold mb-3">Game Impact</h3>
                <p className="opacity-80">
                  Wins and score differentials add small bonuses to reflect real match
                  outcomes.
                </p>
              </div>

            </div>

            {/* Footer Note */}
            <p className="text-center mt-10 text-sm opacity-80">
              A full scoring breakdown is available on the{" "}
              <a
                href="/howitworks"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300 hover:opacity-100 transition"
              >
                How It Works
              </a>{" "}
              page.
            </p>

          </div>
        </section>

        {/* PINS SECTION */}
        <section className="w-full py-16">
          <div className="max-w-6xl mx-auto px-4">

            {/* Centered Title */}
            <h2 className="text-3xl font-bold text-center text-[#1f4785] mb-12">
              Collect Pins to Show Your Status
            </h2>

            {/* 4 x 3 Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-10">

              {/* PIN CARD */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="w-20 h-20 relative mb-4">
                  <Image
                    src="/icons/four-foot-finisher.png"
                    alt="First Place"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">Four Foot Finisher</p>
                <p className="text-sm text-gray-600">You're gold! Finish first in a leauge of at least eight.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="w-20 h-20 relative mb-4">
                  <Image
                    src="/icons/eight-foot-finisher.png"
                    alt="Second Place"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">Eight Foot Finisher</p>
                <p className="text-sm text-gray-600">Silver looks good on you! Finish second in a leauge of at least eight.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="w-20 h-20 relative mb-4">
                  <Image
                    src="/icons/twelve-foot-finisher.png"
                    alt="Third Place"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">Twelve Foot Finisher</p>
                <p className="text-sm text-gray-600">Hitting the rings and the podium! Finish third in a leauge of at least eight.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="w-20 h-20 relative mb-4">
                  <Image
                    src="/icons/first-event-winner.png"
                    alt="First Event Winner"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">First Event Winner</p>
                <p className="text-sm text-gray-600">Your picks were world-class! Each one led their position in fantasy points.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="w-20 h-20 relative mb-4">
                  <Image
                    src="/icons/second-event-winner.png"
                    alt="Second Event Winner"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">Second Event Winner</p>
                <p className="text-sm text-gray-600">Your picks held their own! Each landed second in fantasy points at their positions.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-2xl">
                <div className="w-20 h-20 relative mb-4">
                  <Image
                    src="/icons/clean-sweep.png"
                    alt="Clean Sweep"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">Clean Sweep</p>
                <p className="text-sm text-gray-600">Your pick delivered a perfect game! A true clean sweep. </p>
              </div>

            </div>
          </div>
        </section>

        {/* PUBLIC LEAGUES */}
        <section className="w-full flex justify-center mb-12 py-12">
          {/* OUTER DARK BLUE CARD */}
          <div className="w-full max-w-6xl bg-[#0a2342] text-white py-12 px-8 rounded-xl shadow-inner">

            <h2 className="text-3xl font-bold mb-8 text-center">
              Public Leagues Happening Right Now
            </h2>

            {/* League Rows */}
            <div className="flex flex-col gap-6">

              {leagues.slice(0, 3).map((league) => (
                <div
                  key={league.id}
                  className="bg-[#12345a] p-5 rounded-lg"
                >
                  <p className="text-2xl font-bold">
                    {league.name}
                    <span className="italic font-normal text-xl opacity-80">
                      {" "}– {league.curling_events.year} {league.curling_events.name}
                    </span>
                  </p>
                </div>
              ))}

              {leagues.length === 0 && (
                <p className="text-center opacity-70">
                  No public leagues available right now.
                </p>
              )}

            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="w-full py-20 flex justify-center">
          <div className="max-w-3xl text-center px-6">

            <h2 className="text-4xl font-bold text-[#1f4785] mb-6">
              Ready to Build Your Rink?
            </h2>

            <p className="text-gray-700 text-lg mb-6">
              Draft teams, compete in leagues, and
              track real‑world performance all season long.
            </p>

            <a
              href="/signup"
              className="inline-block bg-[#ac0000] text-white text-xl font-semibold py-4 px-10 rounded-xl hover:bg-[#8a0000] transition"
              >Get Started</a>

          </div>
        </section>
      </main>
      <BottomBar />
    </>
  )
}
