"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  async function handleSignup() {
    setLoading(true)
    setErrorMsg("")

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setErrorMsg("Please enter an email address.")
      setLoading(false)
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.")
      setLoading(false)
      return
    }

    if (!password || !confirmPassword) {
      setErrorMsg("Please fill out the password fields.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.")
      setLoading(false)
      return
    }

    if(!firstName || !lastName || !username) {
      setErrorMsg("Please fill out all fields.")
      setLoading(false)
      return
    }

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

    router.push("/thepin/?welcome=true")
    setLoading(false)
  }

return (
  <div
    className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
    style={{ backgroundImage: "url('/webpage/signup-page.png')" }}
  >
    <div className="w-full flex justify-center scale-[0.85] md:scale-100 origin-center">
      <main className="w-full max-w-lg bg-white shadow-xl rounded-xl p-10">
        <div className="flex justify-center mb-6">
          <Image
            src="/logos/button-home-logo.png"
            alt="BUTTON Logo"
            width={220}
            height={220}
            className="object-contain"
          />
        </div>

        <h1 className="text-3xl font-bold text-[#234C6A] text-center mb-4">
          Create Your Account
        </h1>

        {errorMsg && (
          <p className="text-[#AA2B1D] mb-4 text-center font-medium">
            {errorMsg}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSignup()
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-[#456882] rounded-md px-4 py-2"
          />

          <input
            type="password"
            value={password}
            placeholder="Password"
            className="border border-[#456882] rounded-md px-4 py-2"
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="border border-[#456882] rounded-md px-4 py-2"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <input
            placeholder="First Name"
            className="border border-[#456882] rounded-md px-4 py-2"
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            placeholder="Last Name"
            className="border border-[#456882] rounded-md px-4 py-2"
            onChange={(e) => setLastName(e.target.value)}
          />

          <input
            placeholder="Username"
            className="border border-[#456882] rounded-md px-4 py-2"
            onChange={(e) => setUsername(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md hover:bg-[#1B3C53] transition disabled:bg-gray-400"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-[#1B3C53]">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-[#AA2B1D] font-semibold hover:underline"
          >
            Log in
          </a>
        </p>
      </main>
    </div>
  </div>
)

}
