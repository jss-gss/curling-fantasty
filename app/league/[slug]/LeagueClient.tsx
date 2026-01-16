"use client"

import { useEffect, useState, use } from "react"
import { supabase } from "@/lib/supabaseClient"
import LoggedInNavBar from "@/components/LoggedInNavBar"
import Image from "next/image"
import Link from "next/link"

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
}

type Pick = {
  user_id: string
  player_id: string
  players: Player
}

type ParamsPromise = Promise<{ slug: string }>

export default function DraftRoom({ params }: { params: ParamsPromise }) {
    const { slug } = use(params)
    const [league, setLeague] = useState<League | null>(null)
    const [user, setUser] = useState<any>(null) 

    useEffect(() => {
    const fetchLeague = async () => {
        const { data, error } = await supabase
        .from("fantasy_events")
        .select(`
            *,
            sender:profiles!fantasy_events_created_by_fkey (
            id,
            username,
            avatar_url,
            is_public
            ),
            curling_events (*),
            fantasy_event_users (
            user_id,
            draft_position,
            points,
            rank,
            profiles (
                id,
                username,
                avatar_url,
                is_public
            )
            ),
            fantasy_event_user_invites (
            user_id
            ),
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
                total_player_fantasy_pts
            )
            )
        `)
        .eq("slug", slug)
        .single()

        if (error) {
        console.error("League fetch error:", error)
        return
        }

        setLeague(data) 
    }

    fetchLeague()
    }, [slug])

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [])

    if (!league) return <div>Loading...</div>

    const userId = user?.id
    const isEnrolled = league.fantasy_event_users.some((u) => u.user_id === userId)
    const isInvited = league.fantasy_event_user_invites?.some((inv: { user_id: string }) => inv.user_id === userId)
    const isPrivateAndBlocked = !league.is_public && !isEnrolled && !isInvited

    function OpenLeagueView({ league } : any) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-semibold mb-4">Players</h2>

            <ul className="space-y-2">
                {league.fantasy_event_users.map((u: LeagueUser) => (
                <li key={u.user_id}>
                    {u.profiles.is_public ? (
                    <a
                        href={`/profile/${u.profiles.id}`}
                        className="text-blue-600 hover:underline"
                    >
                        {u.profiles.username}
                    </a>
                    ) : (
                    <span>{u.profiles.username}</span>
                    )}
                </li>
                ))}
            </ul>
            </div>
        )
    }

    function ClosedLeagueView() {
        return (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h2 className="text-xl font-semibold text-yellow-800">Draft in Progress</h2>
            <p className="text-yellow-700 mt-2">
                The draft is currently underway. Check back soon.
            </p>
            </div>
        )
    }

    function LockedLeagueView({ league }: { league: League }) {
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
            </tr>
            </thead>

            <tbody>
            {league.fantasy_event_users
                .sort((a: LeagueUser, b: LeagueUser) => a.rank - b.rank)
                .map((u: LeagueUser, idx: number) => {
                const picks = picksByUser[u.user_id] || []
                const profile = u.profiles

                return [
                    // MAIN ROW
                    <tr
                    key={`${u.user_id}-main`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                    <td className="py-2 px-3 font-medium">{idx + 1}</td>

                    <td className="py-2 px-3">
                        {profile.avatar_url ? (
                        <Image
                            src={profile.avatar_url}
                            alt={`${profile.username} avatar`}
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
                    </tr>,

                    // PICKS ROW
                    <tr
                    key={`${u.user_id}-picks`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                    <td colSpan={4} className="py-3 px-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {picks.map((p: Pick) => (
                            <div
                            key={p.player_id}
                            className="p-3 bg-gray-100 rounded-md border"
                            >
                            <p className="font-semibold">
                                {p.players.first_name} {p.players.last_name}
                            </p>
                            <p className="text-xs text-gray-600">
                                {p.players.position}
                            </p>
                            <p className="text-sm mt-1">
                                Fantasy Points:{" "}
                                <strong>
                                {p.players.total_player_fantasy_pts}
                                </strong>
                            </p>
                            </div>
                        ))}
                        </div>
                    </td>
                    </tr>,
                ]
                })}
            </tbody>
        </table>
        </div>
    )
    }

    function FinalLeaderboardView({ league } : any) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-semibold mb-4">Final Results</h2>

            <ol className="space-y-4">
                {league.fantasy_event_users
                .sort((a: LeagueUser, b: LeagueUser) => a.rank - b.rank)
                .map((u: LeagueUser, index: number) => (
                    <li
                    key={u.user_id}
                    className={`p-4 rounded-lg border ${
                        index === 0 ? "bg-yellow-100 border-yellow-300" : "bg-gray-50"
                    }`}
                    >
                    <div className="flex justify-between items-center">
                        <div className="text-lg font-semibold">
                        {u.profiles.is_public ? (
                            <a
                            href={`/profile/${u.profiles.id}`}
                            className="text-blue-600 hover:underline"
                            >
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

    function formatDate(dateString: string) {
        const [year, month, day] = dateString.split("-")
        return `${month}/${day}/${year}`
    }
    
    if (isPrivateAndBlocked) {
        return (
            <>
            <LoggedInNavBar />
            <div className="p-6 max-w-xl mx-auto text-center">
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Private League</h2>
                <p>This league is private and you do not have access.</p>
                </div>
            </div>
            </>
        )
    }

    return (
    <>
        <LoggedInNavBar />
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
    </>
    )
}
