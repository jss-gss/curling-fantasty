"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import Image from "next/image"
import GameTicker from "@/components/GameTicker"
import HomeNavBar from "@/components/HomeNavBar"
import BottomBar from "@/components/LoggedInBottomBar"

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        router.replace("/thepin")
        return
      }
      setUser(null)
    }
    checkUser()
  }, [router])

  return (
    <>

      <main className="w-full flex flex-col items-center text-center px-6 mt-10">

        {/* HERO SECTION */}
        <section className="relative w-full max-w-6xl mb-16">
          {/* Background image placeholder */}
          <div className="relative h-[300px] md:h-[380px] w-full rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/images/hero-placeholder.jpg" // replace with your curling image
              alt="Curling Hero"
              fill
              className="object-cover brightness-75"
            />
          </div>

          <div className="absolute inset-0 flex flex-col justify-center items-center text-white px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
              Fantasy Curling. Built for Competitors.
            </h1>
            <p className="text-lg md:text-xl mt-4 max-w-2xl opacity-90">
              Track live scores. Build your roster. Climb the leaderboard.
            </p>
          </div>
        </section>

        {/* FULL-WIDTH PROMO CARD */}
        <section className="w-full max-w-5xl mb-16">
          <div className="bg-white p-10 rounded-xl shadow-xl border border-gray-200 text-left">
            <h2 className="text-3xl font-bold text-[#1f4785] mb-3">
              Register to Play Fantasy Curling
            </h2>
            <p className="text-gray-700 text-lg mb-6">
              The first fantasy curling league to draft players for national and international competitions.
            </p>

            <button
              onClick={() => router.push("/signup")}
              className="bg-[#ac0000] text-white px-10 py-3 rounded-lg text-lg font-semibold hover:bg-[#8a0000] transition shadow-md"
            >
              Step into the Hack
            </button>
          </div>
        </section>

        {/* FEATURE CARDS */}
        <section className="w-full max-w-5xl mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Card 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-left transition transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="aspect-video w-full relative mb-4 rounded-lg overflow-hidden">
                <Image
                  src="/images/join-placeholder.jpg"
                  alt="Join League"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">Join or Create a League</h3>
              <p className="text-gray-700">
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
              <h3 className="text-xl font-semibold mb-2">Draft Your Rink</h3>
              <p className="text-gray-700">
                Pick curlers from national and international events.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-left transition transform hover:-translate-y-1 hover:shadow-2xl">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/score-points.png"
                  alt="Score Points"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>

              <h3 className="text-xl font-semibold mb-2">Score Points</h3>
              <p className="text-gray-700">
                Earn points based on real‑world performance.
              </p>
            </div>
          </div>
        </section>

        {/* LIVE SCORES */}
        <section className="w-full bg-[#0f1a2b] text-white py-12 mb-24 shadow-inner">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6 text-left">Live Scores & Updates</h2>
            <div className="bg-[#152238] p-6 rounded-xl shadow-lg">
              <GameTicker />
            </div>
          </div>
        </section>

      </main>

      <BottomBar />
    </>
  )
}
