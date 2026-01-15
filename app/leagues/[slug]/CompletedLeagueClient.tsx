"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import LoggedInNavBar from "@/components/LoggedInNavBar"

type ParamsPromise = Promise<{ slug: string }>

export default function CompletedLeague({ params }: { params: ParamsPromise }) {
  const { slug } = use(params)
  const router = useRouter()

  return (
    <>
        <LoggedInNavBar />
        <main>
            
        </main>
    </>
  )
}