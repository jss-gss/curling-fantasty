"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
import { useRouter } from "next/navigation"

type Step = "request" | "verify"

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default function ResetPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("request")

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [didReset, setDidReset] = useState(false)

  const [requestedEmail, setRequestedEmail] = useState("")

  const signOutRan = useRef(false)
  const redirectTimer = useRef<number | null>(null)

  useEffect(() => {
    if (signOutRan.current) return
    signOutRan.current = true

    ;(async () => {
      await supabase.auth.signOut()
    })()
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current)
    }
  }, [])

  const clearAlerts = () => {
    setMsg("")
    setErrorMsg("")
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAlerts()
    setLoading(true)

    try {
      const trimmed = email.trim()

      if (!trimmed || !isValidEmail(trimmed)) {
        setErrorMsg("Please enter a valid email address.")
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmed)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setMsg("A verification code from Supabase Auth has been sent to your email.")
      setRequestedEmail(trimmed)
      setStep("verify")
    } finally {
      setLoading(false)
    }
  }

  const verifyAndChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAlerts()
    setLoading(true)

    try {
      const trimmedEmail = requestedEmail || email.trim()
      const trimmedCode = code.trim()

      if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
        setErrorMsg("Enter the same email you requested the code with.")
        return
      }

      if (!trimmedCode) {
        setErrorMsg("Please enter the verification code.")
        return
      }

      if (!password || !confirmPassword) {
        setErrorMsg("Please fill out the password fields.")
        return
      }

      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.")
        return
      }

      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: "recovery",
      })

      if (verifyErr) {
        setErrorMsg("Invalid or expired code. Please request a new one.")
        return
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password })

      if (updateErr) {
        setErrorMsg(updateErr.message)
        return
      }

      setDidReset(true)
      setMsg("Password reset successfully. Redirecting to login…")

      await supabase.auth.signOut()

      redirectTimer.current = window.setTimeout(() => {
        router.push("/login?reset=success")
      }, 2500)
    } finally {
      setLoading(false)
    }
  }

  const resetToRequest = () => {
    setStep("request")
    setCode("")
    setRequestedEmail("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setDidReset(false)
    clearAlerts()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4"
      style={{ backgroundImage: "url('/webpage/reset-password-page.png')" }}
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

          <h1 className="text-3xl font-bold text-[#234C6A] text-center mb-2">
            Reset Password
          </h1>

          {step === "request" ? (
            <p className="text-center text-[#1B3C53] mb-6">
              Enter the email address associated with your account to receive a verification code.
            </p>
          ) : (
            <p className="text-center text-[#1B3C53] mb-6">
              Enter the verification code and create a new password.
            </p>
          )}

          {errorMsg && (
            <p className="text-[#AA2B1D] mb-4 text-center font-medium">{errorMsg}</p>
          )}
          {msg && (
            <p className="text-green-700 mb-4 text-center font-medium">{msg}</p>
          )}

          {step === "request" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-[#456882] rounded-md px-4 py-2"
              />

              <button
                type="submit"
                disabled={loading || didReset}
                className="mt-2 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md hover:bg-[#1B3C53] disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyAndChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Email</label>
                <div className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-gray-800">
                  {requestedEmail || email}
                </div>
              </div>

              <input
                type="text"
                placeholder="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="border border-[#456882] rounded-md px-4 py-2"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={loading || didReset}
              />

              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-[#456882] rounded-md px-4 py-2"
                autoComplete="new-password"
                disabled={loading || didReset}
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border border-[#456882] rounded-md px-4 py-2"
                autoComplete="new-password"
                disabled={loading || didReset}
              />

              <button
                type="submit"
                disabled={loading || didReset}
                className="mt-2 px-6 py-3 bg-[#234C6A] text-white text-lg rounded-md hover:bg-[#1B3C53] disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>

              <button
                type="button"
                onClick={resetToRequest}
                disabled={loading || didReset}
                className="text-sm text-blue-700 underline mt-1 disabled:opacity-60"
              >
                Request a new code
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  )
}
