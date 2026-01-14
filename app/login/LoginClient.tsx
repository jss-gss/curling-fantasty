"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  async function handleLogin() {
    setLoading(true)
    setErrorMsg("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg("Invalid email or password.")
      setLoading(false)
      return
    }

    router.push("/thepin");
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4" style={{ backgroundImage: "url('/webpage/login-page.png')" }} >
      <main className="w-full max-w-lg bg-white shadow-xl rounded-xl p-10">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logos/button-home-logo.png"
            alt="BUTTON Logo"
            width={220}
            height={220}
            className="object-contain"
          />
        </div>

        <h1 className="text-3xl font-bold text-[#234C6A] text-center mb-2">
          Welcome Back
        </h1>

        <p className="text-center text-[#1B3C53] mb-6">
          Log in to continue your fantasy curling journey.
        </p>

        {/* Error Message */}
        {errorMsg && (
          <p className="text-[#AA2B1D] mb-4 text-center font-medium">
            {errorMsg}
          </p>
        )}

        {/* Form */}
        <div className="flex flex-col gap-4">

          <input
            type="email"
            placeholder="Email"
            className="border border-[#456882] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#234C6A]"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="border border-[#456882] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#234C6A]"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-4 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md hover:bg-[#1B3C53] transition disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </div>

        <p className="mt-6 text-center text-[#1B3C53]">
          Don’t have an account?{" "}
          <a href="/signup" className="text-[#AA2B1D] font-semibold hover:underline">
            Sign up
          </a>
        </p>
      </main>
    </div>
  )
}
