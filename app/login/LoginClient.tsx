"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("reset") === "success") {
      setResetSuccess(true)
    }
  }, [])

  async function handleLogin() {
    setLoading(true)
    setErrorMsg("")
    setResetSuccess(false)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data?.user) {
      setErrorMsg("Invalid email or password.")
      setLoading(false)
      return
    }

    router.push("/thepin")
    setLoading(false)
  }

  const handleForgot = async () => {
    if (!email) {
      setErrorMsg("Enter your email first, then click Forgot Password.")
      return
    }

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/resetpassword`,
    })

    setErrorMsg(`A link to reset your password has been sent to ${email}`)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
      style={{ backgroundImage: "url('/webpage/login-page.png')" }}
    >
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

        <h1 className="text-3xl font-bold text-[#234C6A] text-center mb-2">
          Welcome Back
        </h1>

        <p className="text-center text-[#1B3C53] mb-6">
          Log in to continue your fantasy curling journey.
        </p>

        {resetSuccess && (
          <p className="text-green-600 mb-4 text-center font-medium">
            Password reset successfully.
          </p>
        )}

        {errorMsg && (
          <p className="text-[#AA2B1D] mb-4 text-center font-medium">
            {errorMsg}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-[#456882] rounded-md px-4 py-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-[#456882] rounded-md px-4 py-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-[#1B3C53]">
          Don’t have an account?{" "}
          <a href="/signup" className="text-[#AA2B1D] font-semibold hover:underline">
            Sign up
          </a>
        </p>

        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={handleForgot}
            className="text-[#AA2B1D] font-semibold hover:underline"
          >
            Forgot Password?
          </button>
        </p>
      </main>
    </div>
  )
}
