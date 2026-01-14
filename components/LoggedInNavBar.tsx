"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)

      if (data.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single()

        setProfile(profileData)
      }
    }

    loadUser()
  }, [])

  const tabs = [
    { name: "The Pin", href: "/thepin" },
    { name: "My Rinks", href: "/myrinks" },
    { name: "League Play", href: "/leagues" },
    { name: "Leaderboard", href: "/leaderboard" },
  ]

  const displayName = profile?.username ? profile.username : ""

  return (
    <div
      className="w-full border-b border-[#1B3C53] h-16 flex items-center sticky top-0 z-50"
      style={{ backgroundColor: "#234C6A" }}
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 w-full relative">
        
        {/* LEFT SIDE — LOGO */}
        <div className="flex items-center gap-2">
          <Image
            src="/logos/button-main-logo.png"
            alt="BUTTON Logo"
            width={200}
            height={200}
            className="object-contain"
          />
        </div>

        {/* RIGHT SIDE — NAV TABS */}
        <div className="flex gap-12 text-lg font-medium items-center">

          {tabs.map((tab) => {
            const active = pathname === tab.href

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pb-1 transition-all ${
                  active
                    ? "border-b-2 border-[#AA2B1D] text-white"
                    : "text-white hover:border-b-2 hover:border-[#AA2B1D]"
                }`}
              >
                {tab.name}
              </Link>
            )
          })}

          {/* USER DROPDOWN */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="text-white hover:text-[#E3E3E3] font-medium"
              >
                {displayName}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-md p-2 text-[#234C6A] z-50">
                  <button
                    className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                    onClick={() => router.push("/profile")}
                  >
                    Profile
                  </button>

                  <button
                    className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                    onClick={async () => {
                      await supabase.auth.signOut()
                      window.location.href = "/"
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
