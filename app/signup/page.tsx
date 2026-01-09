"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    setLoading(true)

    // 1. Create the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    const user = data.user

    // If email confirmation is ON, user will be null until they click the link
    if (!user) {
      alert("Check your email to confirm your account before logging in.")
      setLoading(false)
      return
    }

    // 2. Create the matching profile row
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      username: username,
    })

    if (profileError) {
      alert(profileError.message)
      setLoading(false)
      return
    }

    // 3. Redirect to home page
    router.push("/home")
    setLoading(false)
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Account</h1>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      /><br/>

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      /><br/>

      <input
        placeholder="First Name"
        onChange={(e) => setFirstName(e.target.value)}
      /><br/>

      <input
        placeholder="Last Name"
        onChange={(e) => setLastName(e.target.value)}
      /><br/>

      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      /><br/>

      <button onClick={handleSignup} disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </button>

      <p style={{ marginTop: 20 }}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  )
}
