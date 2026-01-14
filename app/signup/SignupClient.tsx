"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"

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

    router.push("/thepin/?welcome=true");
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4" style={{ backgroundImage: "url('/webpage/signup-page.png')" }} >
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
          Create Your Account
        </h1>

        <p className="text-center text-[#1B3C53] mb-6">
          Join the competition and start building your fantasy curling legacy.
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

          <input
            placeholder="First Name"
            className="border border-[#456882] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#234C6A]"
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            placeholder="Last Name"
            className="border border-[#456882] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#234C6A]"
            onChange={(e) => setLastName(e.target.value)}
          />

          <input
            placeholder="Username"
            className="border border-[#456882] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#234C6A]"
            onChange={(e) => setUsername(e.target.value)}
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="mt-4 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md hover:bg-[#1B3C53] transition disabled:bg-gray-400"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </div>

        <p className="mt-6 text-center text-[#1B3C53]">
          Already have an account?{" "}
          <a href="/login" className="text-[#AA2B1D] font-semibold hover:underline">
            Log in
          </a>
        </p>
      </main>
    </div>
  )
}
