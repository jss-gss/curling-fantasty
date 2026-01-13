"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import Image from "next/image"
import GameTicker from "@/components/GameTicker"
import HomeNavBar from "@/components/HomeNavBar"


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
      <HomeNavBar />
      <main className="w-full flex flex-col items-center text-center px-6 mt-16">
        {/* HERO SECTION */}
        <section className="max-w-4xl">
          <h1 className="text-5xl font-extrabold text-[#1f4785] mb-4">
            Welcome to the House
          </h1>

          <p className="text-gray-700 text-lg mb-8">
            Build your dream rink. Draft your favorite curlers. Compete with friends.
            The ultimate curling fantasy experience starts here.
          </p>
        </section>

        {/* GAME TICKER */}
        <div className="w-full max-w-5xl mt-16">
          <GameTicker />
        </div>

        {/* HOW IT WORKS */}
        <section className="max-w-5xl mt-20 text-left">
          <h2 className="text-3xl font-bold text-[#1f4785] mb-6 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            <div className="bg-white shadow-md p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">1. Join a League</h3>
              <p className="text-gray-700">
                Find a public league or create your own private league with friends.
              </p>
            </div>

            <div className="bg-white shadow-md p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">2. Draft Your Team</h3>
              <p className="text-gray-700">
                Pick your favorite curlers before the event begins. Strategy matters.
              </p>
            </div>

            <div className="bg-white shadow-md p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">3. Score Points</h3>
              <p className="text-gray-700">
                Earn points based on real‑world performance. Climb the leaderboard.
              </p>
            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 mb-24">
          <h2 className="text-3xl font-bold text-[#1f4785] mb-4">
            Ready to step into the hack?
          </h2>

          <button
            onClick={() => router.push("/signup")}
            className="bg-[#ac0000] text-white px-10 py-3 rounded-lg text-lg font-semibold hover:bg-[#8a0000] transition"
          >
            Create Your Account
          </button>
        </section>

      </main>
    </>
  )
}
