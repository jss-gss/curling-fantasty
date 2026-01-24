"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { achievementIcons } from "@/lib/achievementIcons"
import { useAchievementModal } from "@/app/ModalProvider"
import AchievementModal from "@/components/AchievementModal"

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [openUser, setOpenUser] = useState(false)
  const [openMobile, setOpenMobile] = useState(false)

  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const { setModal } = useAchievementModal()

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setOpenUser(false)
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(t)) setOpenMobile(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const tabs = [
    { name: "The Pin", href: "/thepin" },
    { name: "My Rinks", href: "/myrinks" },
    { name: "League Play", href: "/leagueplay" },
    { name: "Leaderboard", href: "/leaderboard" },
  ]

  const displayName = profile?.username ?? ""

  const handleLogoClick = async () => {
    if (!user) return

    const res = await fetch("/api/award-achievement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        achievement: "FOUND_THE_BUTTON",
      }),
    })

    const { earned } = await res.json()

    if (earned) {
      setModal(
        <AchievementModal
          open={true}
          onClose={() => setModal(null)}
          title="Found the Button!"
          icon={
            <Image
              src={achievementIcons.FOUND_THE_BUTTON}
              alt="Found the Button"
              width={160}
              height={160}
            />
          }
        />
      )
    }
  }

return (
  <div
    className="w-full border-b border-[#1B3C53] h-16 flex items-center sticky top-0 z-50 overflow-visible"
    style={{ backgroundColor: "#234C6A" }}
  >
    <div className="max-w-screen-xl mx-auto flex items-center px-2 w-full relative">
      <button
        onClick={handleLogoClick}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full overflow-hidden bg-transparent h-14 w-14 lg:h-24 lg:w-24"
      >
        <Image
          src="/logos/button-main-logo.png"
          alt="BUTTON Logo"
          width={192}
          height={192}
          className="object-contain"
        />
      </button>

      <div className="hidden lg:flex items-center gap-12 text-lg font-medium ml-auto">
        {tabs.map(tab => {
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

        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setOpenUser(prev => !prev)}
              className={`pb-1 transition-all text-white font-medium h-8 flex items-center ${
                openUser
                  ? "border-b-2 border-[#AA2B1D]"
                  : "hover:border-b-2 hover:border-[#AA2B1D]"
              }`}
            >
              {displayName}
            </button>

            {openUser && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-md p-2 text-[#234C6A] z-50">
                <button
                  className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                  onClick={() => {
                    setOpenUser(false)
                    router.push("/profile")
                  }}
                >
                  Profile
                </button>

                <button
                  className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                  onClick={async () => {
                    setOpenUser(false)
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

      <div className="flex lg:hidden items-center gap-3 ml-auto" ref={mobileMenuRef}>
        {user && (
          <button
            onClick={() => setOpenUser(prev => !prev)}
            className="text-white text-sm font-medium px-2 py-1 rounded-md hover:bg-white/10"
          >
            {displayName}
          </button>
        )}

        <button
          onClick={() => setOpenMobile(prev => !prev)}
          className="text-white text-2xl leading-none px-2 py-1 rounded-md hover:bg-white/10"
          aria-label="Open menu"
        >
          ☰
        </button>

        {openUser && user && (
          <div className="absolute right-4 top-14 w-44 bg-white shadow-md rounded-md p-2 text-[#234C6A] z-50">
            <button
              className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
              onClick={() => {
                setOpenUser(false)
                setOpenMobile(false)
                router.push("/profile")
              }}
            >
              Profile
            </button>

            <button
              className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
              onClick={async () => {
                setOpenUser(false)
                setOpenMobile(false)
                await supabase.auth.signOut()
                window.location.href = "/"
              }}
            >
              Log Out
            </button>
          </div>
        )}

        {openMobile && (
          <div className="absolute right-4 top-14 w-56 bg-white shadow-md rounded-md p-2 text-[#234C6A] z-50">
            {tabs.map(tab => {
              const active = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpenMobile(false)}
                  className={`block px-3 py-2 rounded-md transition ${
                    active ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"
                  }`}
                >
                  {tab.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  </div>
)
}
