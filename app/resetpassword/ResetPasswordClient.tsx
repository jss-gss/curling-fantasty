"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace("#", ""))
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!password || !confirmPassword) {
      setErrorMsg("Please fill out both password fields.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.")
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg("Something went wrong. Try again.")
      return
    }

    router.push("/login?reset=success")
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
          Reset Password
        </h1>

        <p className="text-center text-[#1B3C53] mb-6">
          Enter your new password below.
        </p>

        {errorMsg && (
          <p className="text-[#AA2B1D] mb-4 text-center font-medium">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-[#456882] rounded-md px-4 py-2"
          />

          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border border-[#456882] rounded-md px-4 py-2"
          />

          <button
            type="submit"
            className="mt-4 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md hover:bg-[#1B3C53]"
          >
            Update Password
          </button>
        </form>
      </main>
    </div>
  )
}
