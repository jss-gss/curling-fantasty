"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import GameTicker from "@/components/GameTicker"
import LoggedInNavBar from "@/components/LoggedInNavBar"

export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/")
        return
      }

      setUser(userData.user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      setProfile(profileData)
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="w-full flex justify-center mt-20 text-gray-600">
        Loading profile...
      </div>
    )
  }

  return (
    <>
        <GameTicker />
        <LoggedInNavBar />
            
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-md">
        <h1 className="text-2xl font-bold text-[#1f4785] mb-6">
            My Profile
        </h1>

        <div className="flex items-center gap-6">
            {/* Avatar Placeholder */}
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl">
                {profile?.username?.charAt(0)?.toUpperCase() ?? "?"}
                </div>

                <div>
                <p className="text-lg font-semibold text-gray-800">
                    {profile?.username}
                </p>
                <p className="text-gray-600">{user?.email}</p>
                </div>
            </div>

            <div className="mt-8 border-t pt-6">
                <h2 className="text-xl font-semibold text-[#1f4785] mb-3"> Account Details</h2>

                <div className="space-y-2 text-gray-700">
            <p>
                <strong>Joined on:</strong>{" "}
                {profile?.joined_on
                    ? new Date(profile.joined_on + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })
                    : "—"}
            </p>
            </div>
        </div>
        </div>
    </>
  )
}
