"use client"

import NavBar from "@/components/LoggedInNavBar"
import BottomBar from "@/components/LoggedInBottomBar"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <main className="flex-1">
        {children}
      </main>

      <BottomBar />
    </div>
  )
}
