"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    router.push("/home")
  }

    return (
    <div style={{ padding: 40 }}>
        <h1>Login</h1>

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

        <button onClick={handleLogin}>Log In</button>

        <p>
        Don’t have an account? <a href="/signup">Sign up</a>
        </p>
    </div>
    )
}
