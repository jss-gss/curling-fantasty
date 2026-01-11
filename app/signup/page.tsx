"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"
import LoggedOutNavBar from "@/components/LoggedOutNavBar"
import GameTicker from "@/components/GameTicker"

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSignup() {
    setLoading(true)
    setErrorMsg("")

    // 1. Check if username is taken
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (existingUser) {
      setErrorMsg("That username is already taken.")
      setLoading(false)
      return
    }

    // 2. Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    const user = data.user

    if (!user) {
      setErrorMsg("Check your email to confirm your account before logging in.")
      setLoading(false)
      return
    }

    // 3. Create profile row
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      username: username,
    })

    if (profileError) {
      setErrorMsg(profileError.message)
      setLoading(false)
      return
    }

    // 4. Redirect
    router.push("/home")
    setLoading(false)
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans px-4">
        <main className="flex w-full max-w-xl flex-col items-center py-12 px-10 bg-white shadow-md">

          {/* Logo */}
          <Image
            src="/webpage/hh-cards-logo.png"
            alt="House Hustlers Logo"
            width={300}
            height={300}
            className="mb-6 object-contain"
          />

          <h1 className="text-2xl font-bold text-black mb-2">
            Create Your Account
          </h1>

          <p className="text-gray-700 mb-6 text-center">
            Join the competition and start building your fantasy curling legacy.
          </p>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-red-600 mb-4 text-center">{errorMsg}</p>
          )}

          {/* Form */}
          <div className="w-full flex flex-col gap-4">

            <input
              type="email"
              placeholder="Email"
              className="border px-4 py-2"
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="border px-4 py-2"
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              placeholder="First Name"
              className="border px-4 py-2"
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              placeholder="Last Name"
              className="border px-4 py-2"
              onChange={(e) => setLastName(e.target.value)}
            />

            <input
              placeholder="Username"
              className="border px-4 py-2"
              onChange={(e) => setUsername(e.target.value)}
            />

            <button
              onClick={handleSignup}
              disabled={loading}
              className="mt-4 px-6 py-3 bg-[#1f4785] text-white text-lg hover:bg-[#162a4a] transition disabled:bg-gray-400"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </div>

          <p className="mt-6 text-gray-700">
            Already have an account?{" "}
            <a href="/" className="text-[#1f4785] underline">
              Log in
            </a>
          </p>
        </main>
      </div>
    </>
  )
}
