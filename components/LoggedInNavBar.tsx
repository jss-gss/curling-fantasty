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

  const desktopUserMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileUserMenuRef = useRef<HTMLDivElement | null>(null)
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

      const insideDesktopUser =
        desktopUserMenuRef.current &&
        desktopUserMenuRef.current.contains(t)

      const insideMobileUser =
        mobileUserMenuRef.current &&
        mobileUserMenuRef.current.contains(t)

      if (!insideDesktopUser && !insideMobileUser) {
        setOpenUser(false)
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(t)
      ) {
        setOpenMobile(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
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
          className="absolute left-2 sm:left-3 lg:left-4 top-1/2 -translate-y-1/2 overflow-hidden bg-transparent"
        >
          <img
            src="/logos/button-main-logo.png"
            alt="BUTTON Logo"
            className="h-6 w-auto lg:h-8"
          />
        </button>

        <div className="hidden lg:flex items-center gap-15 text-lg font-medium ml-auto">
          {[...tabs, ...(user ? [{ name: displayName || "Account", href: "/profile" }] : [])].map(
            (tab) => {
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
            }
          )}
        </div>

        <div className="flex lg:hidden items-center gap-4 ml-auto" ref={mobileMenuRef}>
          <Link
            href="/thepin"
            onClick={() => {
              setOpenMobile(false)
              setOpenUser(false)
            }}
            className={`h-9 flex items-center text-white text-md font-medium transition ${
              pathname === "/thepin"
                ? "border-b-2 border-[#AA2B1D]"
                : "hover:border-b-2 hover:border-[#AA2B1D]"
            }`}
          >
            The Pin
          </Link>

          <button
            onClick={() => {
              setOpenMobile(prev => !prev)
              setOpenUser(false)
            }}
            className="h-9 w-9 flex items-center justify-center text-white hover:text-gray-300"
            aria-label="Open menu"
          >
            <span className="text-2xl leading-none">☰</span>
          </button>

          {openMobile && (
            <div className="absolute right-2 top-14 w-56 bg-white shadow-md rounded-md p-2 text-[#234C6A] z-50">
              {tabs
                .filter(t => t.href !== "/thepin")
                .map(tab => {
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

              {user && (
                <Link
                  href="/profile"
                  onClick={() => setOpenMobile(false)}
                  className={`block px-3 py-2 rounded-md transition ${
                    pathname === "/profile"
                      ? "bg-gray-100 font-semibold"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {displayName || "Account"}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
