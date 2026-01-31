"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import CreateLeagueModal from "@/components/CreateLeagueModal"

export default function LeaguesPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLeague, setEditingLeague] = useState<any>(null)
  const searchParams = useSearchParams()
  const shouldOpenCreate = searchParams.get("create") === "true"
  const [activeTab, setActiveTab] = useState<"mine" | "explore">(
    searchParams.get("tab") === "explore" ? "explore" : "mine"
  )

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const res = await fetch("/api/check-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await res.json()
      if (!data.allowed) {
        router.push("/login")
        return
      }
      setUserId(user.id)
      setUser(user)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!userId) return
    const loadLeagues = async () => {
      const { data: leagueData } = await supabase
        .from("fantasy_events")
        .select(`
          *,
          curling_events (*),
          fantasy_event_users ( user_id ),
          fantasy_event_user_invites ( user_id ),
          users:profiles!fantasy_events_created_by_fkey ( id, username, is_public )
        `)
        .order("draft_date", { ascending: true })

      if (!leagueData) {
        setLeagues([])
        setLoading(false)
        return
      }

      const processed = leagueData.map(l => ({
        ...l,
        enrolled: l.fantasy_event_users?.some((u: { user_id: string }) => u.user_id === userId),
        invited: l.fantasy_event_user_invites?.some((inv: { user_id: string }) => inv.user_id === userId)
      }))

      setLeagues(processed)
      setLoading(false)
    }
    loadLeagues()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const loadEvents = async () => {
      const { data } = await supabase
        .from("curling_events")
        .select("*")
        .order("start_date", { ascending: true })
      setEvents(data || [])
    }
    loadEvents()
  }, [userId])

  useEffect(() => {
    if (shouldOpenCreate) {
      setShowModal(true)
    }
  }, [shouldOpenCreate])

  const commissionedLeagues = leagues.filter(l => l.created_by === userId)

  const privateInvites = leagues.filter(
    l =>
      !l.is_public &&
      !l.enrolled &&
      !(l.fantasy_event_users.length >= l.max_users) &&
      l.created_by !== userId &&
      l.draft_status === "open" &&
      l.fantasy_event_user_invites?.some((inv: { user_id: string }) => inv.user_id === userId)
  )

  const myActiveLeagues = leagues.filter(
    l =>
      (l.enrolled || l.created_by === userId) &&
      l.draft_status === "locked"
  )

  const myUpcomingDrafts = leagues.filter(
    l =>
      (l.enrolled || l.created_by === userId) &&
      l.draft_status === "open"
  )

  const findAvailableLeagues = leagues.filter(
    l =>
      l.is_public &&
      !l.enrolled &&
      l.draft_status === "open" &&
      l.fantasy_event_users.length < l.max_users
  )

  const completedLeagues = leagues.filter(
    l =>
      (l.enrolled || l.created_by === userId) &&
      l.draft_status === "completed"
  )

  const activeLeagueCount = leagues.filter(
    l =>
      l.created_by === userId &&
      ["open", "closed", "locked"].includes(l.draft_status)
  ).length

  const fullLeagues = leagues.filter(
    l => l.fantasy_event_users.length >= l.max_users
  )

  useEffect(() => {
    async function loadLeagues() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        setUser(null)
        setLeagues([])
        setLoading(false)
        return
      }

      setUser(userData.user)

      const { data: leagueData, error } = await supabase
        .from("fantasy_events")
        .select(`
          *,
          curling_events (*),
          fantasy_event_users ( user_id ),
          fantasy_event_user_invites ( user_id ),
          users:profiles!fantasy_events_created_by_fkey ( id, username, is_public )
        `)
        .order("draft_date", { ascending: true })

      if (error) {
        setLeagues([])
        setLoading(false)
        return
      }

      if (!leagueData) {
        setLeagues([])
        setLoading(false)
        return
      }

      const processed = leagueData.map((l) => ({
        ...l,
        enrolled: l.fantasy_event_users?.some(
          (u: { user_id: string }) => u.user_id === userData.user.id
        ),
        invited: l.fantasy_event_user_invites?.some(
          (inv: { user_id: string }) => inv.user_id === userData.user.id
        )
      }))

      setLeagues(processed)
      setLoading(false)
    }

    loadLeagues()
  }, [])

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from("curling_events")
        .select("*")
        .order("start_date", { ascending: true })

      setEvents(data || [])
    }

    loadEvents()
  }, [])

  async function joinLeague(id: string) {
    if (!user) return

    await supabase.from("fantasy_event_users").insert({
      fantasy_event_id: id,
      user_id: user.id,
    })

    setLeagues((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              enrolled: true,
              fantasy_event_users: [
                ...(l.fantasy_event_users ?? []),
                { user_id: user.id },
              ],
            }
          : l
      )
    )
    setActiveTab("mine")
  }

  async function leaveLeague(id: string) {
    if (!user) return

    await supabase
      .from("fantasy_event_users")
      .delete()
      .eq("fantasy_event_id", id)
      .eq("user_id", user.id)

    setLeagues((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              enrolled: false,
              fantasy_event_users: l.fantasy_event_users?.filter(
                (u: any) => u.user_id !== user.id
              ),
            }
          : l
      )
    )
  }

  function formatDate(dateString: string) {
    const [year, month, day] = dateString.split("-")
    return `${month}/${day}/${year}`
  }

  function LeagueCard({ league, commissionerView, invitedView }: any) {
    const is_commissioner = commissionerView || league.created_by === user?.id

    const isInvited =
      invitedView ||
      (
        league.draft_status === "open" &&
        !league.is_public &&
        !league.enrolled &&
        league.fantasy_event_users?.some((u: any) => u.user_id === user?.id)
      )


    const isOpen = league.draft_status === "open"
    const isComplete = league.draft_status === "completed"
    const isFull = (league.fantasy_event_users?.length ?? 0) >= league.max_users

    function renderLeagueAction() {
      if (isComplete) {
        return (
          <button
            onClick={() => router.push(`/league/${league.slug}`)}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
          >
            View Results
          </button>
        )
      }

      if (league.draft_status !== "open") return null

      if (is_commissioner) {
        return (
          <button
            onClick={() => {
              setEditingLeague(league)
              setShowModal(true)
            }}
            className="bg-[#1f4785] text-white px-6 py-2 rounded-md hover:bg-[#163766] transition"
          >
            Edit
          </button>
        )
      }

      if (isInvited) {
        return (
          <button
            onClick={() => joinLeague(league.id)}
            className="bg-[#234C6A] text-white px-6 py-2 rounded-md hover:bg-[#1B3C53] transition"
          >
            Join
          </button>
        )
      }

      if (league.enrolled) {
        return (
          <button
            onClick={() => leaveLeague(league.id)}
            className="bg-[#AA2B1D] text-white px-6 py-2 hover:bg-[#8A1F15] transition rounded-md"
          >
            Leave
          </button>
        )
      }

      if (isFull) {
        return null 
      }

      return (
        <button
          onClick={() => joinLeague(league.id)}
          className="px-4 py-2 text-white rounded-md bg-[#234C6A] hover:bg-[#1B3C53]"
        >
          Join
        </button>
      )
    }

    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 sm:hidden">
          <h2
            className="mt-2 text-lg font-semibold leading-snug hover:underline cursor-pointer break-words"
            onClick={() => router.push(`/league/${league.slug}`)}
          >
            {league.name}
          </h2>
          
          <div className="flex flex-wrap items-center mt-1 gap-2">
            {league.is_public ? (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                public
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                private
              </span>
            )}

            {is_commissioner && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                draw master
              </span>
            )}

            {isComplete && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                completed
              </span>
            )}
          </div>

          {league.description && (
            <p className="text-gray-700 text-sm mt-2 italic break-words">
              {league.description}
            </p>
          )}

          <div className="mt-2 text-sm text-gray-700 break-words">
            {league.curling_events.year} {league.curling_events.name} in{" "}
            {league.curling_events.location}
          </div>

          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Created By:</span>{" "}
              {league.users?.is_public ? (
                <a
                  href={`/profile/${league.users.username}`}
                  className="text-blue-600 hover:underline"
                >
                  {league.users.username}
                </a>
              ) : (
                <span>{league.users?.username}</span>
              )}
            </div>

            <div>
              <span className="font-semibold">Draft:</span>{" "}
              {new Date(league.draft_date).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "short",
                timeStyle: "short",
              })}{" "}
              ET
            </div>

            <div>
              <span className="font-semibold">Event Starts:</span>{" "}
              {formatDate(league.curling_events.start_date)}
            </div>

            <div>
              <span className="font-semibold">Round Robin Ends:</span>{" "}
              {formatDate(league.curling_events.round_robin_end_date)}
            </div>

            <div>
              <span className="font-semibold">Participants:</span>{" "}
              {(league.fantasy_event_users?.length ?? 0)}
              {isOpen && ` / ${league.max_users}`}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {renderLeagueAction()}
          </div>
        </div>

        <div className="hidden sm:flex relative items-center justify-between bg-white p-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2
                className="text-2xl font-semibold hover:underline cursor-pointer"
                onClick={() => router.push(`/league/${league.slug}`)}
              >
                {league.name}
              </h2>

              {league.is_public ? (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  public
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                  private
                </span>
              )}

              {is_commissioner && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                  draw master
                </span>
              )}

              {isComplete && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                  completed
                </span>
              )}
            </div>

            {league.description && (
              <p className="text-gray-700 text-sm mt-1 italic">{league.description}</p>
            )}

            <p className="text-md text-gray mt-3">
              {league.curling_events.year} {league.curling_events.name} in{" "}
              {league.curling_events.location}
            </p>

            <p className="text-sm text-gray-600 mt-3">
              <strong>Created By:</strong>{" "}
              {league.users?.is_public ? (
                <a
                  href={`/profile/${league.users.username}`}
                  className="text-blue-600 hover:underline"
                >
                  {league.users.username}
                </a>
              ) : (
                <span>{league.users?.username}</span>
              )}
              <strong> • Draft:</strong>{" "}
              {new Date(league.draft_date).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "short",
                timeStyle: "short",
              })}{" "}
              ET <strong>• Event Starts:</strong>{" "}
              {formatDate(league.curling_events.start_date)}{" "}
              <strong>• Round Robin Ends:</strong>{" "}
              {formatDate(league.curling_events.round_robin_end_date)}{" "}
              <strong> • Participants:</strong>{" "}
              {(league.fantasy_event_users?.length ?? 0)}
              {isOpen && ` / ${league.max_users}`}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">{renderLeagueAction()}</div>
        </div>
      </div>
    )
  }

  function generateBaseSlug(leagueName: string) {
    return leagueName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  async function generateUniqueSlug(baseSlug: string, supabase: any) {
    let slug = baseSlug
    let counter = 1

    while (true) {
      const { data } = await supabase
        .from("fantasy_events")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle()

      if (!data) return slug

      counter++
      slug = `${baseSlug}-${counter}`
    }
  }

  async function handleCreateLeague(payload: any) {
    if (!user) return

    const { eventId, name, description, draftDate, isPublic, usernames, maxUsers } = payload

    function parseLocalDateTime(dt: string) {
      const [datePart, timePart] = dt.split("T")
      const [year, month, day] = datePart.split("-").map(Number)
      const [hour, minute] = timePart.split(":").map(Number)
      return new Date(year, month - 1, day, hour, minute)
    }

    const utcDraftDate = new Date(draftDate).toISOString()
    const baseSlug = generateBaseSlug(name)
    const slug = await generateUniqueSlug(baseSlug, supabase)

    const { data: newLeague, error } = await supabase
      .from("fantasy_events")
      .insert({
        slug,
        name,
        description,
        curling_event_id: eventId,
        draft_date: utcDraftDate,
        created_by: user.id,
        is_public: isPublic,
        draft_status: "open",
        max_users: maxUsers,
      })
      .select(`
        *,
        curling_events (*),
        fantasy_event_users ( user_id ),
        users:profiles!fantasy_events_created_by_fkey ( id, username, is_public )
      `)
      .single()

    if (error) return

    if (!isPublic && usernames.trim() !== "") {
      const usernameList = usernames
        .split(",")
        .map((u: string) => u.trim())
        .filter(Boolean)

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", usernameList)

      if (profiles?.length) {
        await supabase.from("fantasy_event_user_invites").insert(
          profiles.map((p: { id: string }) => ({
            fantasy_event_id: newLeague.id,
            user_id: p.id
          }))
        )
      }
    }

    await supabase.from("fantasy_event_users").insert({
      fantasy_event_id: newLeague.id,
      user_id: user.id
    })

    setLeagues(prev => [
      ...prev,
      {
        ...newLeague,
        enrolled: true,
        fantasy_event_users: [{ user_id: user.id }]
      }
    ])

    setShowModal(false)
  }

  async function handleUpdateLeague(payload: any) {
    if (!editingLeague) return

    const { eventId, name, description, draftDate, isPublic, usernames, maxUsers } = payload

    const utcDraftDate = new Date(draftDate).toISOString()

    let slug = editingLeague.slug
    if (name !== editingLeague.name) {
      const baseSlug = generateBaseSlug(name)
      slug = await generateUniqueSlug(baseSlug, supabase)
    }

    const { data: updatedLeague, error } = await supabase
      .from("fantasy_events")
      .update({
        curling_event_id: eventId,
        name,
        description,
        draft_date: utcDraftDate,
        is_public: isPublic,
        max_users: maxUsers,
        slug
      })
      .eq("id", editingLeague.id)
      .select(`
        *,
        fantasy_event_user_invites ( user_id )
      `)
      .single()

    if (error) return

    if (!isPublic && usernames?.trim()) {
      const usernameList = usernames
        .split(",")
        .map((u: string) => u.trim())
        .filter(Boolean)

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", usernameList)

      if (profiles?.length) {
        const alreadyInvited = new Set(
          updatedLeague.fantasy_event_user_invites.map((i: any) => i.user_id)
        )

        const newInvites = profiles
          .filter((p: any) => !alreadyInvited.has(p.id))
          .map((p: any) => ({
            fantasy_event_id: updatedLeague.id,
            user_id: p.id
          }))

        if (newInvites.length > 0) {
          await supabase.from("fantasy_event_user_invites").insert(newInvites)
        }
      }
    }

    setLeagues(prev =>
      prev.map(l => (l.id === editingLeague.id ? { ...l, ...updatedLeague } : l))
    )

    setShowModal(false)
    setEditingLeague(null)
  }

  async function handleDeleteLeague(id: string) {
    await supabase.from("fantasy_events").delete().eq("id", id)

    setLeagues(prev => prev.filter(l => l.id !== id))
    setShowModal(false)
    setEditingLeague(null)
  }

  return (
    <>
      <CreateLeagueModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingLeague(null)
        }}
        onSubmit={editingLeague ? handleUpdateLeague : handleCreateLeague}
        onDelete={editingLeague ? () => handleDeleteLeague(editingLeague.id) : undefined}
        events={events}
        isNew={!editingLeague}
        league={editingLeague}
      />

      <div className="w-full px-3 sm:px-6 py-6 sm:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between sm:block">
              <h1 className="text-2xl sm:text-3xl font-bold mb-6">League Play</h1>

              <button
                disabled={activeLeagueCount >= 2}
                onClick={() => {
                  setEditingLeague(null)
                  setShowModal(true)
                }}
                className={`sm:hidden w-10 h-10 flex items-center justify-center rounded-full text-white text-2xl shadow-md transition ${
                  activeLeagueCount >= 2
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#1f4785] hover:bg-[#163766]"
                }`}
              >
                +
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center sm:justify-between">
              <div className="flex gap-2 sm:gap-4">
                {[
                  { key: "mine", label: "My Leagues" },
                  { key: "explore", label: "Explore Available Leagues" }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base transition ${
                      activeTab === tab.key ? "bg-[#1f4785] text-white" : "text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative group hidden sm:block">
                <button
                  disabled={activeLeagueCount >= 2}
                  onClick={() => {
                    setEditingLeague(null)
                    setShowModal(true)
                  }}
                  className={`w-12 h-12 flex items-center justify-center rounded-full text-white text-2xl shadow-md transition ${
                    activeLeagueCount >= 2
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#1f4785] hover:bg-[#163766]"
                  }`}
                >
                  +
                </button>

                <span
                  className={`absolute left-1/2 -translate-x-1/2 -bottom-12 whitespace-nowrap px-3 py-1 rounded-md text-sm backdrop-blur-sm transition pointer-events-none ${
                    activeLeagueCount >= 2 ? "bg-red-200 text-red-800" : "bg-white/60 text-black"
                  } opacity-0 group-hover:opacity-100`}
                >
                  {activeLeagueCount >= 2
                    ? "Limit reached - max two active drafts"
                    : "Create League"}
                </span>
              </div>
            </div>
          </div>

          {loading && (
            <p className="w-full flex justify-center mt-20 text-gray-600">Loading...</p>
          )}

          {activeTab === "mine" && (
            <>
              {completedLeagues.length > 0 && (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6">Completed Leagues</h3>
                  <div className="flex flex-col gap-6 mb-10">
                    {completedLeagues.map(league => (
                      <LeagueCard key={league.id} league={league} />
                    ))}
                  </div>
                </>
              )}

              <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6">Active Leagues</h3>
              <div className="flex flex-col gap-6 mb-10">
                {myActiveLeagues.length > 0 ? (
                  myActiveLeagues.map(league => (
                    <LeagueCard key={league.id} league={league} />
                  ))
                ) : (
                  <p className="text-gray-600">No active leagues.</p>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-3 mt-6">Upcoming Drafts</h3>
              <div className="flex flex-col gap-6 mb-10">
                {myUpcomingDrafts.length > 0 ? (
                  myUpcomingDrafts.map(league => (
                    <LeagueCard key={league.id} league={league} />
                  ))
                ) : (
                  <p className="text-gray-600">No upcoming drafts.</p>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-3 mt-6">Draw Master Leagues</h3>
              <div className="flex flex-col gap-6 mb-10">
                {commissionedLeagues.length > 0 ? (
                  commissionedLeagues.map(league => (
                    <LeagueCard key={league.id} league={league} commissionerView />
                  ))
                ) : (
                  <p className="text-gray-600">You haven't created any leagues yet.</p>
                )}
              </div>
            </>
          )}

          {activeTab === "explore" && (
            <>
              <h3 className="text-xl font-semibold mb-3 mt-6">Open Leagues</h3>
              <div className="flex flex-col gap-6 mb-10">
                {findAvailableLeagues.length > 0 ? (
                  findAvailableLeagues.map(league => (
                    <LeagueCard key={league.id} league={league} />
                  ))
                ) : (
                  <p className="text-gray-600">No leagues available.</p>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-3 mt-6">Private Invites</h3>
              <div className="flex flex-col gap-6 mb-10">
                {privateInvites.length > 0 ? (
                  privateInvites.map(league => (
                    <LeagueCard key={league.id} league={league} invitedView />
                  ))
                ) : (
                  <p className="text-gray-600">No private league invites.</p>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-3 mt-6">Full Leagues</h3>
              <div className="flex flex-col gap-6 mb-10">
                {fullLeagues.length > 0 ? (
                  fullLeagues.map(league => (
                    <LeagueCard key={league.id} league={league} />
                  ))
                ) : (
                  <p className="text-gray-600">No full leagues.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
