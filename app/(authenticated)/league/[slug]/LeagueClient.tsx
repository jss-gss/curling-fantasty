"use client"

import { useEffect, useState, useRef, use } from "react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
import Link from "next/link"
import AchievementModal from "@/components/AchievementModal";
import { getAchievementIcon } from "@/lib/getAchievementIcon"
import type { AchievementId } from "@/lib/achievementIcons"

type League = {
  id: string
  name: string
  description: string
  draft_status: "open" | "closed" | "locked" | "completed" | "archived"
  is_public: boolean
  max_users: number
  draft_date: string
  created_by: string
  sender?: {
    id: string
    username: string
    avatar_url?: string
    is_public?: boolean
  }
  curling_events?: {
    id: string
    year: number
    name: string
    location: string
    start_date: string
    round_robin_end_date: string
  }
  fantasy_event_users: LeagueUser[]
  fantasy_event_user_invites: { user_id: string }[]
  fantasy_picks: Pick[]
}

type LeagueUser = {
  user_id: string
  draft_position: number | null
  points: number
  rank: number
  profiles: {
    id: string
    username: string
    is_public: boolean
    avatar_url?: string
  }
}

type Player = {
  id: string
  first_name: string
  last_name: string
  team_id: string
  position: string
  player_picture: string | null
  total_player_fantasy_pts: number
  teams?: {
    id: string
    team_name: string
  } | null
}

type Pick = {
  user_id: string
  player_id: string
  players: Player
}

type ParamsPromise = Promise<{ slug: string }>

export default function LeagueClient({ params }: { params: ParamsPromise }) {
    const { slug } = use(params)
    const [league, setLeague] = useState<League | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isCommissioner, setIsCommissioner] = useState(false)
    const [achievements, setAchievements] = useState<any[]>([])
    const [achievementModal, setAchievementModal] = useState<AchievementId | null>(null)
    const achievementFromDB = achievements.find(a => a.code === achievementModal)
    const [modalQueue, setModalQueue] = useState<AchievementId[]>([])
    const hasRun = useRef(false)
    const positions = ["skip", "third", "second", "lead"] as const
    type Position = (typeof positions)[number]
    const positionMap: Record<Position, string> = { skip: "Skip", third: "Vice Skip", second: "Second", lead: "Lead" }    

    const enqueueModal = (code: AchievementId) => {
        setModalQueue(prev => [...prev, code])
    }

    useEffect(() => {
        if (!achievementModal && modalQueue.length > 0) {
        const timer = setTimeout(() => {
            setAchievementModal(modalQueue[0])
            setModalQueue(prev => prev.slice(1))
        }, 800)

        return () => clearTimeout(timer)
        }
    }, [achievementModal, modalQueue])

    useEffect(() => {
        const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            window.location.href = "/login"
            return
        }
        const res = await fetch("/api/check-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id })
        })
        const data = await res.json()
        if (!data.allowed) {
            window.location.href = "/login"
            return
        }
        setUserId(user.id)
        }
        checkAuth()
    }, [])

    useEffect(() => {
        if (!userId) return

        const fetchLeague = async () => {
            const { data } = await supabase
            .from("fantasy_events")
            .select(`
                *,
                sender:profiles!fantasy_events_created_by_fkey (
                id, username, avatar_url, is_public
                ),
                curling_events (*),
                fantasy_event_users (
                user_id, draft_position, points, rank,
                profiles ( id, username, avatar_url, is_public )
                ),
                fantasy_event_user_invites ( user_id ),
                fantasy_picks (
                user_id,
                player_id,
                players (
                    id,
                    first_name,
                    last_name,
                    team_id,
                    position,
                    player_picture,
                    total_player_fantasy_pts,
                    teams (
                    id,
                    team_name
                    )
                )
                )
            `)
            .eq("slug", slug)
            .single()

            setLeague(data)

            if (data?.created_by === userId) 
            { 
                setIsCommissioner(true) 
            }
            setLoading(false)
        }

        fetchLeague()
    }, [slug, userId])

    useEffect(() => {
        const fetchAchievements = async () => {
            const { data } = await supabase
            .from("achievements")
            .select("id, code, name, description")

            if (data) setAchievements(data)
        }

        fetchAchievements()
    }, [])

    const loadTopCurlersForEvent = async (eventId: string) => {
  const results: Record<Position, any[]> = {
    skip: [],
    third: [],
    second: [],
    lead: []
  }

  for (const pos of positions) {
    const dbPos = positionMap[pos]
    console.log("[RPC CALL] pos:", pos, "dbPos:", dbPos, "eventId:", eventId)

    const { data: rows, error } = await supabase.rpc(
      "get_top_curlers_by_event_and_position",
      { event_id: eventId, pos: dbPos }
    )

    if (error) {
      console.error("[RPC ERROR]", pos, error)
    } else {
      console.log("[RPC RESULT]", pos, rows)
    }

    results[pos] = rows ?? []
  }

  console.log("[TOP CURLERS RESULTS]", results)
  return results
}


    const checkAchievements = async () => {
        if (!league || !userId) return

        const users = league.fantasy_event_users
        const me = users.find(u => u.user_id === userId)
        if (!me) return

        const { data: rawRows } = await supabase
            .from("fantasy_event_users")
            .select("fantasy_event_id, fantasy_events(draft_status)")
            .eq("user_id", userId)

        const completedRows = (rawRows as any[]) ?? []
        const completedEvents = completedRows.filter(
            row => row.fantasy_events?.draft_status === "completed"
        )
        const completedCount = completedEvents.length

        const proRow = achievements.find(a => a.code === "PROFESSIONAL_CURLER")
        if (proRow) {
            const { data: existingPro } = await supabase
            .from("user_achievements")
            .select("id")
            .eq("user_id", userId)
            .eq("achievement_id", proRow.id)
            .maybeSingle()

            if (completedCount === 1 && !existingPro) {
            await supabase.from("user_achievements").insert({
                user_id: userId,
                achievement_id: proRow.id
            })
            enqueueModal("PROFESSIONAL_CURLER")
            }
        }

        const rank = me.rank
        const total = users.length

        let achievementCode: AchievementId | null = null
        if (rank === 1) achievementCode = "FOUR_FOOT_FINISHER"
        else if (rank === 2) achievementCode = "EIGHT_FOOT_FINISHER"
        else if (rank === 3) achievementCode = "TWELVE_FOOT_FINISHER"
        else if (rank === total) achievementCode = "WOODEN_BROOM"

        if (achievementCode) {
            const achievementRow = achievements.find(a => a.code === achievementCode)
            if (achievementRow) {
            const { data: existing } = await supabase
                .from("user_achievements")
                .select("id")
                .eq("user_id", userId)
                .eq("achievement_id", achievementRow.id)
                .maybeSingle()

            if (!existing) {
                await supabase.from("user_achievements").insert({
                user_id: userId,
                achievement_id: achievementRow.id
                })
                enqueueModal(achievementCode)
            }
            }
        }

        const eventId = league.curling_events?.id
        if (!eventId) return

        const topCurlers = await loadTopCurlersForEvent(eventId)
        const myPicks = league.fantasy_picks.filter(p => p.user_id === userId)
        const myPlayerIds = myPicks.map(p => p.player_id)
console.log("[CHECK ACHIEVEMENTS] eventId:", eventId)


console.log("[MY PICKS]", myPicks)
console.log("[MY PLAYER IDS]", myPlayerIds)
console.log("[TOP CURLERS FINAL]", topCurlers)

        const hasAllTop1 = positions.every(pos => {
  const rows = topCurlers[pos]
  console.log("[TOP1 CHECK]", pos, "rows:", rows)

  if (!rows.length) {
    console.log("[TOP1 FAIL] no rows for", pos)
    return false
  }

  const id = rows[0].player_id ?? rows[0].curler_id
  const ok = myPlayerIds.includes(id)
  console.log("[TOP1 COMPARE]", { pos, topId: id, ok })
  return ok
})

const hasAllTop2 = positions.every(pos => {
  const rows = topCurlers[pos]
  console.log("[TOP2 CHECK]", pos, "rows:", rows)

  if (rows.length < 2) {
    console.log("[TOP2 FAIL] less than 2 rows for", pos)
    return false
  }

  const id = rows[1].player_id ?? rows[1].curler_id
  const ok = myPlayerIds.includes(id)
  console.log("[TOP2 COMPARE]", { pos, top2Id: id, ok })
  return ok
})

const hasAllBottom = positions.every(pos => {
  const rows = topCurlers[pos]
  console.log("[BOTTOM CHECK]", pos, "rows:", rows)

  if (!rows.length) {
    console.log("[BOTTOM FAIL] no rows for", pos)
    return false
  }

  const bottom = rows[rows.length - 1]
  const id = bottom.player_id ?? bottom.curler_id
  const ok = myPlayerIds.includes(id)
  console.log("[BOTTOM COMPARE]", { pos, bottomId: id, ok })
  return ok
})

console.log("[RESULT] hasAllTop1:", hasAllTop1, "hasAllTop2:", hasAllTop2, "hasAllBottom:", hasAllBottom)


        const award = async (code: AchievementId) => {
            const row = achievements.find(a => a.code === code)
            if (!row) return
            const { data: existing } = await supabase
            .from("user_achievements")
            .select("id")
            .eq("user_id", userId)
            .eq("achievement_id", row.id)
            .maybeSingle()
            if (!existing) {
            await supabase.from("user_achievements").insert({
                user_id: userId,
                achievement_id: row.id
            })
            enqueueModal(code)
            }
        }

        if (hasAllTop1) await award("FIRST_EVENT_WINNER")
        if (hasAllTop2) await award("SECOND_EVENT_WINNER")
        if (hasAllBottom) await award("HOGGED_OUT")
            
    }
    
    useEffect(() => {
        if (!league || !userId) return
        if (!league.curling_events) return
        if (!league.fantasy_event_users) return
        if (!achievements || achievements.length === 0) return
        if (league.draft_status !== "completed") return

        if (hasRun.current) return
        hasRun.current = true

        checkAchievements()
    }, [league, userId, achievements])

    if (loading || !league) return null

    const enrolled = league.fantasy_event_users.some(u => u.user_id === userId)
    const invited = league.fantasy_event_user_invites.some(inv => inv.user_id === userId)
    const blocked = !league.is_public && !enrolled && !invited

    if (blocked) return null

    function formatDate(dateString: string) {
        const [year, month, day] = dateString.split("-")
        return `${month}/${day}/${year}`
    }

    function InvitedRow({ userId }: { userId: string }) {
        const [profile, setProfile] = useState<any>(null)

        useEffect(() => {
            supabase
            .from("profiles")
            .select("id, username, avatar_url, is_public")
            .eq("id", userId)
            .maybeSingle()
            .then(res => setProfile(res.data))
        }, [userId])

        if (!profile) return null

        return (
            <tr className="bg-gray-50">
            <td className="py-2 px-3">
                {profile.avatar_url ? (
                <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
                ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                    {profile.username.charAt(0).toUpperCase()}
                </div>
                )}
            </td>

            <td className="py-2 px-3">{profile.username}</td>

            <td className="py-2 px-3 text-gray-500 italic">Invited</td>
            </tr>
        )
    }

    function OpenLeagueView({ league }: { league: League }) {
        const sorted = [...league.fantasy_event_users].sort((a, b) =>
            a.profiles.username.localeCompare(b.profiles.username)
        )

        const acceptedIds = new Set(sorted.map(u => u.user_id))

        const invited = league.fantasy_event_user_invites.filter(
            inv => !acceptedIds.has(inv.user_id)
        )

        return (
            <div className="bg-white p-6 rounded-lg space-y-8">

            {/* Accepted Users */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Players</h2>
                <div className="overflow-x-auto rounded-lg">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                    <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3"></th>
                        <th className="py-2 px-3">Username</th>
                    </tr>
                    </thead>

                    <tbody>
                    {sorted.map((u, idx) => (
                        <tr
                        key={u.user_id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                        <td className="py-2 px-3 font-medium">{idx + 1}</td>

                        <td className="py-2 px-3">
                            {u.profiles.avatar_url ? (
                            <img
                                src={u.profiles.avatar_url}
                                alt={u.profiles.username}
                                className="w-8 h-8 rounded-full object-cover border border-gray-300"
                            />
                            ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                {u.profiles.username.charAt(0).toUpperCase()}
                            </div>
                            )}
                        </td>

                        <td className="py-2 px-3">
                            {u.profiles.is_public ? (
                            <a
                                href={`/profile/${u.profiles.id}`}
                                className="text-blue-600 hover:underline"
                            >
                                {u.profiles.username}
                            </a>
                            ) : (
                            <span className="text-gray-600">{u.profiles.username}</span>
                            )}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Invited Users (Private Leagues Only) */}
            {league.is_public === false && invited.length > 0 && (
                <div>
                <h2 className="text-lg font-semibold mb-3">Invited</h2>
                <div className="overflow-x-auto rounded-lg">
                    <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                        <th className="py-2 px-3"></th>
                        <th className="py-2 px-3">Username</th>
                        <th className="py-2 px-3">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {invited.map(inv => (
                        <InvitedRow key={inv.user_id} userId={inv.user_id} />
                        ))}
                    </tbody>
                    </table>
                </div>
                </div>
            )}
            </div>
        )
    }

    function ClosedLeagueView() {
        return (
            <div className="bg-yellow-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-800">Draft in Progress</h2>
            <p className="text-yellow-700 mt-2">The draft is currently underway. Check back soon.</p>
            </div>
        )
    }

    function LockedLeagueView({ league }: { league: League }) {
    const [openRows, setOpenRows] = useState<Record<string, boolean>>({})

    const toggleRow = (userId: string) => {
        setOpenRows(prev => ({ ...prev, [userId]: !prev[userId] }))
    }

    const picksByUser = league.fantasy_picks.reduce<Record<string, Pick[]>>(
        (acc, pick) => {
        if (!acc[pick.user_id]) acc[pick.user_id] = []
        acc[pick.user_id].push(pick)
        return acc
        },
        {}
    )

    return (
        <div className="overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-100 text-gray-700">
                <tr>
                    <th className="py-2 px-3 text-left">Rank</th>
                    <th className="py-2 px-3 text-left"></th>
                    <th className="py-2 px-3 text-left">Username</th>
                    <th className="py-2 px-3 text-left">Total Points</th>
                    <th className="py-2 px-3 text-right">Drafted Players</th>
                </tr>
                </thead>
                    <tbody>
                    {league.fantasy_event_users
                        .sort((a, b) => a.rank - b.rank)
                        .map((u, idx) => {
                        const picks = picksByUser[u.user_id] || []
                        const profile = u.profiles
                        const isOpen = openRows[u.user_id]

                        return [
                        // MAIN USER ROW
                        <tr
                            key={`${u.user_id}-main`}
                            className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                            <td className="py-2 px-3 font-medium">{idx + 1}</td>

                            <td className="py-2 px-3">
                            {profile.avatar_url ? (
                                <Image
                                src={profile.avatar_url}
                                alt={profile.username}
                                width={32}
                                height={32}
                                className="rounded-full object-cover border border-gray-300"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                {profile.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            </td>

                            <td className="py-2 px-3 font-medium">
                            {profile.is_public ? (
                                <Link
                                href={`/profile/${profile.username}`}
                                className="text-blue-600 hover:underline"
                                >
                                {profile.username}
                                </Link>
                            ) : (
                                <span className="text-gray-500">{profile.username}</span>
                            )}
                            </td>

                            <td className="py-2 px-3 font-semibold">{u.points}</td>

                            <td className="py-2 px-3 text-right">
                            <button
                                onClick={() => toggleRow(u.user_id)}
                                className="text-lg font-bold text-gray-700 hover:text-black"
                            >
                                {isOpen ? "−" : "+"}
                            </button>
                            </td>
                        </tr>,

                        isOpen && (
                            <tr key={`${u.user_id}-picks`}>
                            <td colSpan={5} className="py-3 px-3">
                            <div className="overflow-hidden rounded-lg">
                                <table className="w-full border-collapse text-sm">
                                <thead className="bg-blue-200 text-gray-700">
                                    <tr>
                                    <th className="py-2 px-3 text-left">Position</th>
                                    <th className="py-2 px-3 text-left"></th>
                                    <th className="py-2 px-3 text-left">Name</th>
                                    <th className="py-2 px-3 text-left">Team</th>
                                    <th className="py-2 px-3 text-center">Fantasy Pts</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {picks.map((p, pIdx) => {
                                    const player = p.players
                                    const team = player.teams

                                    return (
                                        <tr
                                        key={p.player_id}
                                        className={pIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                        >
                                        <td className={`py-2 px-3 ${pIdx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                            {player.position}
                                        </td>

                                        <td className={`py-2 px-3 ${pIdx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                            {player.player_picture ? (
                                            <Image
                                                src={player.player_picture}
                                                alt={player.first_name}
                                                width={32}
                                                height={32}
                                                className="rounded-full object-cover border border-gray-300"
                                            />
                                            ) : (
                                            <div className="w-8 h-8 bg-gray-300 rounded-full" />
                                            )}
                                        </td>

                                        <td className={`py-2 px-3 ${pIdx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                            {player.first_name} {player.last_name}
                                        </td>

                                        <td className={`py-2 px-3 ${pIdx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                            {team?.team_name ?? player.team_id}
                                        </td>

                                        <td className={`py-2 px-3 text-center ${pIdx % 2 === 0 ? "bg-blue-50" : "bg-blue-100"}`}>
                                            {player.total_player_fantasy_pts}
                                        </td>
                                        </tr>
                                    )
                                    })}
                                </tbody>
                                </table>
                            </div>
                            </td>
                            </tr>
                        )
                        ].filter(Boolean)
                        })}
                    </tbody>
            </table>
        </div>
    )
    }

    function FinalLeaderboardView({ league }: { league: League }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4">Final Results</h2>
        <ol className="space-y-4">
            {league.fantasy_event_users
            .sort((a, b) => a.rank - b.rank)
            .map((u, index) => (
                <li
                key={u.user_id}
                className={`p-4 rounded-lg border ${
                    index === 0 ? "bg-yellow-100 border-yellow-300" : "bg-gray-50"
                }`}
                >
                <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold">
                    {u.profiles.is_public ? (
                        <a href={`/profile/${u.profiles.id}`} className="text-blue-600 hover:underline">
                        {u.profiles.username}
                        </a>
                    ) : (
                        u.profiles.username
                    )}
                    </div>
                    <div className="text-right">
                    <p className="text-sm text-gray-600">
                        Rank: <strong>{u.rank}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                        Points: <strong>{u.points}</strong>
                    </p>
                    </div>
                </div>
                </li>
            ))}
        </ol>
        </div>
    )
    }

    return (
    <>
        <div className="w-full px-6 py-10 flex flex-col items-center">

        <div className="w-full max-w-screen-xl bg-white shadow-md p-8 border border-gray-200 rounded-lg">

            {/* HEADER */}
            <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{league.name}</h1>

            {league.is_public ? (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                public
                </span>
            ) : (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                private
                </span>
            )}

            {league.draft_status === "completed" && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                completed
                </span>
            )}

            {isCommissioner && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                draw master
              </span>
            )}

            </div>

            {/* DESCRIPTION */}
            {league.description && (
            <p className="text-gray-700 text-sm mt-1 italic">{league.description}</p>
            )}

            {/* EVENT TITLE */}
            <p className="text-md text-gray mt-2">
            {league.curling_events?.year} {league.curling_events?.name} in{" "}
            {league.curling_events?.location}
            </p>

            {/* META LINE */}
            <p className="text-sm text-gray-600 mt-2">
            <strong>Created By:</strong>{" "}
            {league.sender?.is_public ? (
                <a
                href={`/profile/${league.sender.username}`}
                className="text-blue-600 hover:underline"
                >
                {league.sender.username}
                </a>
            ) : (
                <span>{league.sender?.username}</span>
            )}
            <strong> • Draft:</strong>{" "}
            {new Date(league.draft_date).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "short",
                timeStyle: "short",
            })}{" "}
            ET{" "}
            <strong> • Event Starts:</strong>{" "}
            {formatDate(league.curling_events?.start_date ?? "")}
            <strong> • Round Robin Ends:</strong>{" "}
            {formatDate(league.curling_events?.round_robin_end_date ?? "")}
            <strong> • Players:</strong>{" "}
            {(league.fantasy_event_users?.length ?? 0)} / {league.max_users}
            </p>

            {/* BODY CONTENT */}
            <div className="mt-4">
            {league.draft_status === "open" && <OpenLeagueView league={league} />}
            {league.draft_status === "closed" && <ClosedLeagueView />}
            {league.draft_status === "locked" && <LockedLeagueView league={league} />}
            {["completed", "archived"].includes(league.draft_status) && (
                <FinalLeaderboardView league={league} />
            )}
            </div>

        </div>
        </div> 
        
       {achievementModal && achievementFromDB && (
            <AchievementModal
                open={true}
                onClose={() => setAchievementModal(null)}
                title={achievementFromDB.name}
                description={achievementFromDB.description}
                icon={getAchievementIcon(achievementModal as AchievementId)}
            />
        )}
    </>
    )
}
