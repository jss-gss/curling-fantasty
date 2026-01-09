"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()

      // If logged in → redirect to /home
      if (data.user) {
        router.replace("/home")
        return
      }

      // Otherwise show landing page
      setUser(null)
    }

    checkUser()
  }, [router])

  return (
    <div
      className="flex min-h-screen items-center justify-center font-sans"
      style={{ backgroundColor: "#ededf9" }}
    >
      <main className="flex w-full max-w-2xl flex-col items-center justify-center py-24 px-10 bg-white rounded-xl shadow-md">

        {/* Logo */}
        <Image
          src="/webpage/hh-cards-logo.png"
          alt="House Hustlers Logo"
          width={180}
          height={180}
          className="mb-8 object-contain"
        />

        {/* Title */}
        <h1 className="text-4xl font-bold text-black mb-4">
          Welcome to House Hustlers
        </h1>

        <p className="text-lg text-gray-700 mb-8 text-center">
          Your competitive sports prediction league starts here.
        </p>

        {/* Login Button */}
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-md text-lg hover:bg-blue-700 transition"
          onClick={() => router.push("/login")}
        >
          Log In
        </button>
      </main>
    </div>
  )
}
