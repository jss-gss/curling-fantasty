"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"

export default function NavBar() {
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
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
  ]

  return (
    <div className="sticky top-0 z-50 w-full border-b border-gray-300 h-16 flex items-center" style={{ backgroundColor: "#f2f2f2" }}>
        
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 w-full relative">
        
        {/* LEFT SIDE — LOGO (not clickable) */}
        <div className="flex items-center gap-2">
          <Image
            src="/webpage/hh-cards-logo.png"
            alt="House Hustlers Logo"
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
                    ? "border-b-2 border-[#1f4785] text-[#1f4785]"
                    : "text-[#1f4785] hover:border-b-2 hover:border-[#ac0000]"
                }`}
              >
                {tab.name}
              </Link>
            )
          })}

        {/* USER DROPDOWN */}
        <div className="relative">
        <button
            onClick={() => setOpen(!open)}
            className="text-[#1f4785] hover:text-gray-800 font-medium"
        >
            {user ? "Account" : "Log In"}
        </button>

        {open && (
            <div className="absolute right-0 mt-2 w-64 bg-white shadow-md p-4 text-black z-50">

            {!user && (
                <LoginForm />
            )}
            </div>
        )}
        </div>
        </div>
      </div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin() {
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      window.location.reload()
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="Email"
        className="border p-2 w-full"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2 w-full"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-[#ac0000] text-sm">{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-[#1f4785] text-white py-2 hover:bg-[#162a4a]"
      >
        {loading ? "Logging in..." : "Log In"}
      </button>

      <button
        onClick={() => (window.location.href = "/signup")}
        className="text-[#1f4785] underline text-sm mt-1"
      >
        Don't have an account? Sign up
      </button>
    </div>
  )
}
