"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import Image from "next/image"
import LoggedOutNavBar from "@/components/LoggedOutNavBar"
import GameTicker from "@/components/GameTicker"

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()

      // If logged in → redirect to /thepin
      if (data.user) {
        router.replace("/thepin")
        return
      }

      // Otherwise show landing page
      setUser(null)
    }

    checkUser()
  }, [router])

  return (
    <>
    <LoggedOutNavBar />
      <h1 className="text-3xl font-bold mb-6">Welcome to the House</h1>
    </>
  )
}
