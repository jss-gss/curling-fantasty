"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { useRouter, useSearchParams } from "next/navigation"
import NextMajorEvent from "@/components/NextMajorEvent"
import WelcomeModal from "@/components/WelcomeModal"
import GameTicker from "@/components/GameTicker"
import AchievementModal from "@/components/AchievementModal"
import { getAchievementIcon } from "@/lib/getAchievementIcon"
import type { AchievementId } from "@/lib/achievementIcons"

function Countdown({ target }: { target: Date }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = target.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeLeft("00:00:00")
        clearInterval(interval)
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [target])

  return <span>{timeLeft}</span>
}

export default function ThePinClient() {
  const router = useRouter()
  const params = useSearchParams()

  const [user, setUser] = useState<User | null>(null)
  const [dismissedInvites, setDismissedInvites] = useState<string[]>([])
  const [dismissedCompleted, setDismissedCompleted] = useState<string[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingDrafts, setUpcomingDrafts] = useState<any[]>([])
  const nextDraft = upcomingDrafts[0] ?? null
  const [showModal, setShowModal] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])
  const [achievementModal, setAchievementModal] = useState<AchievementId | null>(null)
  const achievementFromDB = achievements.find(a => a.code === achievementModal)
  const [modalQueue, setModalQueue] = useState<AchievementId[]>([])
  const [triviaQuestion, setTriviaQuestion] = useState<any>(null)
  const [triviaLoading, setTriviaLoading] = useState(true)
  const [triviaFeedback, setTriviaFeedback] = useState<"correct" | "wrong" | null>(null)
  const [upcomingGames, setUpcomingGames] = useState<any[]>([])
  const updates = [{ id: 1, text: "• Second version complete! Includes a new draft style, new scoring, improved mobile ui features, and more.", date: "02/02/2026" }
  ]
  const greetings = ["Hi", "Welcome back", "Good to see you", "Hey there", "Glad you're here", "Nice to see you again", ]
  const [lockedRows, setLockedRows] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/upcoming-games")
      .then(res => res.json())
      .then(data => {
        setUpcomingGames(data)
      })
  }, [])

  useEffect(() => {
    const loadTrivia = async () => {
      if (!user?.id) return
      const q = await getNextTriviaQuestion(user.id)
      setTriviaQuestion(q)
      setTriviaLoading(false)
    }
    loadTrivia()
  }, [user])

  useEffect(() => {
    const loadAchievements = async () => {
      const { data } = await supabase
        .from("achievements")
        .select("*")

      setAchievements(data ?? [])
    }

    loadAchievements()
  }, [])

  useEffect(() => {
    const welcome = params.get("welcome")
    if (welcome === "true") {
      const timer = setTimeout(() => setShowModal(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [params])

  function goToDraft(slug: string) {
    router.push(`/draft/${slug}`)
  }

  const greeting = useMemo(() => {
    return greetings[Math.floor(Math.random() * greetings.length)]
  }, [])

  useEffect(() => {
    async function load() {
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

      const auth = await res.json()
      if (!auth.allowed) {
        router.push("/login")
        return
      }

      setUser(user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setProfile(profileData)

      const { data: drafts } = await supabase
        .from("fantasy_events")
        .select(`
          id,
          slug,
          name,
          description,
          draft_date,
          draft_status,
          max_users,
          created_by,
          is_public,
          sender:profiles!fantasy_events_created_by_fkey (
            id,
            username,
            avatar_url,
            is_public
          ),
          users:profiles ( id, username, is_public ),
          curling_events ( * ),
          fantasy_event_users!inner ( user_id )
        `)
        .eq("fantasy_event_users.user_id", user.id)
        .in("draft_status", ["open", "closed"])
        .order("draft_date", { ascending: true })

      const processedDrafts = (drafts ?? [])
        .filter(Boolean)
        .map(d => ({
          ...d,
          is_commissioner: d.created_by === user.id
        }))

      setUpcomingDrafts(processedDrafts)

      const { data: leagueData } = await supabase
        .from("fantasy_events")
        .select(`
          *,
          is_public,
          curling_event_id,
          curling_events (
            id,
            name,
            year,
            start_date,
            round_robin_end_date
          ),
          sender:profiles!fantasy_events_created_by_fkey (
            id,
            username,
            avatar_url,
            is_public
          ),
          fantasy_event_users ( user_id ),
          fantasy_event_user_invites ( id, user_id )
        `)

      if (leagueData) {
        const processedLeagues = leagueData
          .filter(Boolean)
          .map((l: any) => ({
            ...l,
            enrolled: l.fantasy_event_users?.some(
              (u: { user_id: string }) => u.user_id === user.id
            ),
            invited: l.fantasy_event_user_invites?.some(
              (inv: { user_id: string }) => inv.user_id === user.id
            ),
            is_commissioner: l.created_by === user.id
          }))

        setLeagues(processedLeagues)
      }

      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    const stored = localStorage.getItem("dismissedInvites")
    if (stored) {
      setDismissedInvites(JSON.parse(stored))
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("dismissedCompletedLeagues")
    if (stored) setDismissedCompleted(JSON.parse(stored))
  }, [])

  function dismissInvite(inviteId: string) {
    const updated = [...dismissedInvites, inviteId]
    setDismissedInvites(updated)
    localStorage.setItem("dismissedInvites", JSON.stringify(updated))
  }

  function dismissCompletedLeague(leagueId: string) {
    const updated = [...dismissedCompleted, leagueId]
    setDismissedCompleted(updated)
    localStorage.setItem("dismissedCompletedLeagues", JSON.stringify(updated))
  }

  const privateInvites = leagues.filter(l => {
    const invite = l.fantasy_event_user_invites?.find(
      (inv: { id: string; user_id: string }) => inv.user_id === user?.id
    )
    if (!invite) return false
    if (dismissedInvites.includes(invite.id)) return false
    if (l.enrolled) return false
    if (l.created_by === user?.id) return false
    if (l.is_public) return false
    if (l.draft_status !== "open") return false
    return true
  })

  const isRecentlyCompletedLeague = (l: any) => {
    if (l.draft_status === "completed") return true

    return false
  }

  const completedLeagueNotifs = leagues.filter(l => {
    if (!user?.id) return false
    if (!l.enrolled) return false
    if (dismissedCompleted.includes(l.id)) return false
    if (!isRecentlyCompletedLeague(l)) return false
    return true
  })

  const getNextTriviaQuestion = async (userId: string) => {
    const { data: answered } = await supabase
      .from("trivia_user_answers")
      .select("question_id")
      .eq("user_id", userId)

    const answeredIds = answered?.map(a => a.question_id) ?? []

    const { data: next } = await supabase
      .from("trivia_questions")
      .select("*")
      .not("id", "in", `(${answeredIds.join(",")})`)
      .limit(1)

    return next?.[0] ?? null
  }

  const submitTriviaAnswer = async (userId: string, questionId: string, userAnswer: boolean) => {
    const { data: question } = await supabase
      .from("trivia_questions")
      .select("answer")
      .eq("id", questionId)
      .single()

    const correct = question!.answer === userAnswer

    await supabase.from("trivia_user_answers").insert({
      user_id: userId,
      question_id: questionId,
      correct
    })

    return correct
  }

  const getTotalTriviaQuestions = async () => {
    const { count } = await supabase
      .from("trivia_questions")
      .select("*", { count: "exact", head: true })

    return count ?? 0
  }

  const getCorrectCount = async (userId: string) => {
    const { data } = await supabase
      .from("trivia_user_answers")
      .select("correct")
      .eq("user_id", userId)

    return data?.filter(r => r.correct).length ?? 0
  }

  const handleTriviaAnswer = async (userAnswer: boolean) => {
    if (!triviaQuestion || !user?.id) return

    const correct = await submitTriviaAnswer(
      user.id,
      triviaQuestion.id,
      userAnswer
    )

    setTriviaFeedback(correct ? "correct" : "wrong")

    setTimeout(async () => {
      const next = await getNextTriviaQuestion(user.id)

      if (!next) {
        await checkStoneColdAward(user.id)
        setTriviaQuestion(null)
        setTriviaFeedback(null)
        return
      }

      setTriviaQuestion(next)
      setTriviaFeedback(null)
    }, 1200)
  }

  const checkStoneColdAward = async (userId: string) => {
    const total = await getTotalTriviaQuestions()
    const correct = await getCorrectCount(userId)

    const percent = (correct / total) * 100

    if (percent >= 90) {
      await award("STONE_COLD_KNOW_IT_ALL")
    }
  }

  const award = async (code: AchievementId) => {
      const row = achievements.find(a => a.code === code)
      if (!row) return
      const { data: existing } = await supabase
      .from("user_achievements")
      .select("id")
      .eq("user_id", user!.id)
      .eq("achievement_id", row.id)
      .maybeSingle()
      if (!existing) {
      await supabase.from("user_achievements").insert({
          user_id: user!.id,
          achievement_id: row.id
      })
      enqueueModal(code)
      }
  }

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
    if (!nextDraft) return

    const channel = supabase
      .channel("draft-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fantasy_events",
          filter: `id=eq.${nextDraft.id}`
        },
        payload => {
          setUpcomingDrafts(prev =>
            prev.map(d =>
              d.id === payload.new.id
                ? {
                    ...d,
                    ...payload.new,
                    is_commissioner: payload.new.created_by === user?.id,
                  }
                : d
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [nextDraft?.id, user?.id])

  useEffect(() => {
    if (!user?.id) return

    const loadLockedLeagues = async () => {
      const { data, error } = await supabase
        .from("fantasy_event_users")
        .select(`
          fantasy_event_id,
          points,
          rank,
          fantasy_events!inner (
            id,
            slug,
            name,
            draft_status,
            curling_event_id,
            curling_events (
              year,
              start_date,
              round_robin_end_date
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("fantasy_events.draft_status", "locked")

      if (!error && data) {
        setLockedRows(data)
      }
    }

    loadLockedLeagues()
  }, [user?.id])

  function startOfDay(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, m - 1, d, 0, 0, 0, 0)
  }

  function startOfNextDay(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  }

  const lockedLeagues = useMemo(() => {
    const now = new Date()

    const rows = lockedRows ?? []

    return rows
      .map(r => {
        const ev = (r as any).fantasy_events
        const ce = ev?.curling_events
        return {
          id: ev?.id,
          slug: ev?.slug,
          name: ev?.name,
          year: ev?.year,
          my_rank: r.rank,
          my_points: r.points,
          start_date: ce?.start_date ?? null,
          round_robin_end_date: ce?.round_robin_end_date ?? null,
        }
      })
      .filter(lg => !!lg.id && !!lg.slug && !!lg.name)
      .filter(lg => {
        if (!lg.start_date || !lg.round_robin_end_date) return false
        return (
          now >= startOfDay(lg.start_date) &&
          now < startOfNextDay(lg.round_robin_end_date)
        )
      })
      .sort((a, b) => (a.my_rank ?? 9999) - (b.my_rank ?? 9999))
  }, [lockedRows])

  return (
    <>
      <div className="relative w-full min-h-[100dvh] overflow-x-hidden overscroll-none">
        <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('/webpage/pin-page.png')" }} />
          {showModal && (
            <WelcomeModal
              onClose={() => setShowModal(false)}
              username={profile?.username}
            />
          )}

          <div className="flex flex-col lg:flex-row w-full max-w-[1450px] mx-auto gap-6 py-6 px-4 lg:py-10 lg:px-6">
            <aside className="hidden lg:flex w-1/5 flex-col gap-6">
              <div className="bg-white shadow-md p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-3">Curling Favorites</h2>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    <a
                      href="https://worldcurling.org"
                      target="_blank"
                      className="hover:text-[#ac0000] underline"
                    >
                      World Curling Federation ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.curlingzone.com"
                      target="_blank"
                      className="hover:text-[#ac0000] underline"
                    >
                      CurlingZone ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://curling.gg/"
                      target="_blank"
                      className="hover:text-[#ac0000] underline"
                    >
                      curling.gg ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.olympics.com/en/milano-cortina-2026/schedule/cur"
                      target="_blank"
                      className="hover:text-[#ac0000] underline"
                    >
                      2026 Milan Olympics ↗
                    </a>
                  </li>
                </ul>
              </div>

              <div className="bg-white shadow-md p-4 rounded-lg">
                <NextMajorEvent />
              </div>

              <div className="bg-white shadow-md p-4 rounded-lg">
                <img
                  src="/webpage/featured-image.jpg"
                  alt="Sidebar Image"
                  className="w-full h-auto object-contain rounded-md"
                />
              </div>
            </aside>

            <div className="flex flex-col flex-1 gap-4 lg:gap-6">
              <div className="flex flex-col lg:flex-row flex-1 gap-6 items-stretch">
                <main className="bg-white shadow-md p-4 lg:p-8 rounded-lg flex-grow text-sm sm:text-base">
                  {loading ? (
                    <p className="w-full flex justify-center mt-20 text-gray-600">Loading...</p>
                  ) : (
                    <div className="space-y-5 lg:space-y-6">
                      <header className="space-y-2">
                        <h1 className="text-2xl lg:text-3xl font-bold">
                          {greeting}, {profile?.username}!
                        </h1>

                        <p className="text-gray-600 mb-5">
                          Here’s what’s happening around the rings today.
                        </p>

                        {lockedLeagues.length > 0 && <hr className="border-gray-300" />}
                        
                        {lockedLeagues.length > 0 && (
                          <div className="space-y-2">
                            <h2 className="text-md font-semibold mt-4">Current Standings</h2>

                            <div className="space-y-2">
                              {lockedLeagues.length ? (
                                lockedLeagues.map(lg => (
                                  <button
                                    key={lg.id}
                                    type="button"
                                    onClick={() => router.push(`/league/${lg.slug}`)}
                                    className="w-full bg-blue-50 text-left rounded-md px-3 py-2 hover:bg-blue-100 transition flex items-center justify-between gap-3"
                                  >
                                    
                                    <span className="text-md cursor-pointer truncate">
                                      {lg.name}
                                    </span>

                                    <span className="shrink-0 text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                                      <span className="font-semibold">Points:</span> {lg.my_points ?? "—"}
                                      <span className="text-gray-400">•</span>
                                      <span className="font-semibold">Rank:</span> {lg.my_rank ?? "—"}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <p className="text-sm text-gray-600"></p>
                              )}
                            </div>
                          </div>
                        )}
                      </header>

                      {completedLeagueNotifs.length > 0 && <hr className="border-gray-300" />}

                      {completedLeagueNotifs.length > 0 && (
                        <section className="space-y-4">
                          {completedLeagueNotifs.map(league => {
                            const leagueId = String(league.id)

                            return (
                              <div
                                key={leagueId}
                                className="p-5 rounded-lg bg-green-50 border border-green-200 grid grid-cols-[1fr_auto] items-stretch gap-x-6"
                              >
                                <div className="flex flex-col gap-1">
                                  <h2 className="text-lg font-semibold text-green-900">
                                    Standings Finalized for <span className="font-semibold">{league.name}</span>
                                  </h2>

                                  <p className="text-sm text-gray-700 mt-1">
                                    Round robin for the {league.curling_events.year} {league.curling_events.name} is complete. 
                                  </p>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <button
                                    onClick={() => dismissCompletedLeague(leagueId)}
                                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                                    aria-label="Dismiss completed league"
                                  >
                                    ×
                                  </button>

                                  <button
                                    onClick={() => {
                                      dismissCompletedLeague(leagueId)
                                      router.push(`/league/${league.slug}`)
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-800 transition text-sm leading-none"
                                  >
                                    View Results
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </section>
                      )}

                      {privateInvites.length > 0 && <hr className="border-gray-300" />}

                      {privateInvites.length > 0 && (
                        <section className="space-y-4">
                          {privateInvites.map(league => {
                            const invite = league.fantasy_event_user_invites.find(
                              (inv: { id: string; user_id: string }) => inv.user_id === user?.id
                            )

                            return (
                              <div
                                key={league.id}
                                className="p-5 rounded-lg bg-blue-50 border border-blue-200 grid grid-cols-[1fr_auto] items-stretch gap-x-6"
                              >
                                <div className="flex flex-col gap-1">
                                  <h2 className="text-lg font-bold text-blue-900">You’ve been invited!</h2>

                                  <p className="text-sm text-gray-700 mt-1">
                                    Join <span className="font-semibold">{league.name}</span> – a private league created by{" "}
                                    {league.sender?.is_public ? (
                                      <span
                                        onClick={() => router.push(`/profile/${league.sender.username}`)}
                                        className="font-semibold text-blue-700 cursor-pointer hover:underline"
                                      >
                                        {league.sender.username}
                                      </span>
                                    ) : (
                                      <span className="font-semibold">{league.sender?.username ?? "someone"}</span>
                                    )}
                                    .
                                  </p>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <button
                                    onClick={() => dismissInvite(invite.id)}
                                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                                    aria-label="Ignore invite"
                                  >
                                    ×
                                  </button>

                                  <button
                                    onClick={() => {
                                      dismissInvite(invite.id)
                                      router.push(`/league/${league.slug}`)
                                    }}
                                    className="bg-[#1f4785] text-white px-4 py-2 rounded-md hover:bg-[#163766] transition text-sm leading-none"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </section>
                      )}

                      <hr className="border-gray-300" />

                      <section>
                        <p className="text-gray-600">
                          Prepare for upcoming Olympic fantasy leagues by exploring{" "}
                        <a
                          href="https://www.thegrandslamofcurling.com/rankings"
                          target="_blank"
                          className="text-[#ac0000] font-semibold hover:underline"
                        >
                          World Team Rankings
                        </a>
                        {" "}by GSOC.
                        </p>
                      </section>

                      {(!nextDraft) && <hr className="border-gray-300" />}

                      <section className="space-y-2">
                        {!nextDraft && (
                          <p>
                            <span className="text-gray-600">No upcoming drafts</span> –{" "}
                            <a href="/leagueplay?tab=explore" className="font-semibold text-[#ac0000] hover:underline">
                              find a league
                            </a>
                            {" "}<span className="text-gray-600">or</span>{" "}
                            <a href="/leagueplay?tab=mine&create=true" className="font-semibold text-[#ac0000] transition-colors hover:underline">
                              create your own
                            </a>.
                          </p>
                        )}
                      </section>

                      <hr className="border-gray-300" />
                      <section className="space-y-2">
                        {nextDraft && (
                          <p>
                            <span className="text-gray-600">Ready for your upcoming draft? Review </span>
                            <a href="/howitworks?section=beforedrafting" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#ac0000] hover:underline">
                               draft rules and guidelines
                            </a>.
                          </p>
                        )}
                      </section>     

                      {(!triviaLoading && triviaQuestion) && <hr className="border-gray-300" />}

                      {!triviaLoading && triviaQuestion && (
                        <section className="space-y-2">
                          <h2 className="text-md font-semibold">Test Your Book Knowledge</h2>

                          <div className="relative">
                            <div className={`${triviaFeedback ? "opacity-0" : "opacity-100"} w-full`}>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <div className="flex items-center gap-3 justify-center sm:justify-start">
                                  <button
                                    onClick={() => handleTriviaAnswer(true)}
                                    className="text-green-600 text-md font-semibold hover:text-green-800"
                                  >
                                    TRUE
                                  </button>

                                  <span className="text-md text-gray-700">or</span>

                                  <button
                                    onClick={() => handleTriviaAnswer(false)}
                                    className="text-red-600 text-md font-semibold hover:text-red-800"
                                  >
                                    FALSE
                                  </button>
                                </div>

                                <span className="hidden sm:inline text-md font-semibold text-gray-700">:</span>

                                <p className="text-sm text-gray-600 text-center sm:text-left sm:flex-1">
                                  {triviaQuestion.question}
                                </p>
                              </div>
                            </div>

                            {triviaFeedback && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <p
                                  className={`text-md ${
                                    triviaFeedback === "correct" ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {triviaFeedback === "correct" ? "Correct!" : "Just missed that one!"}
                                </p>
                              </div>
                            )}
                          </div>
                        </section>
                      )}

                      {updates?.length ? <hr className="border-gray-300" /> : null}

                      {updates?.length ? (
                        <section className="space-y-3">
                          <h2 className="text-md font-semibold">What’s New Around the Site</h2>

                          <ul className="space-y-2">
                            {updates.map((u: any) => (
                              <li key={u.id} className="text-gray-600">
                                <span className="font-medium text-gray-600">{u.text}</span>
                                <span className="text-gray-500 ml-2 text-xs">({u.date})</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      <hr className="border-gray-300" />

                      <section>
                        <p className="text-gray-600">
                          Metrics for calculating fantasy points has changed. Read the improvements on{" "}
                          <a
                            href="/howitworks?section=scoring"
                            className="font-semibold text-[#ac0000] hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            How It Works
                          </a>
                          .
                        </p>
                      </section>
                    </div>
                  )}
                </main>

                {upcomingGames.length > 0 && (
                  <>
                    <div className="lg:hidden">
                      <GameTicker variant="mobile" />
                    </div>

                    <div className="hidden lg:block">
                      <GameTicker />
                    </div>
                  </>
                )}
              </div>

              <div className="lg:hidden bg-white shadow-md p-4 rounded-lg">
                <NextMajorEvent />
              </div>

              {nextDraft && (
                <div className="bg-white shadow-md p-4 lg:p-6 rounded-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">
                      Your Upcoming Draft on{" "}
                      {new Date(nextDraft.draft_date).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}{" "}
                      ET
                    </h2>

                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className="text-md mt-2 font-semibold hover:underline cursor-pointer"
                        onClick={() => router.push(`/league/${nextDraft.slug}`)}
                      >
                        {nextDraft.name}
                      </h3>

                      {nextDraft.is_public ? (
                        <span className="text-xs mt-2 font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          public
                        </span>
                      ) : (
                        <span className="text-xs mt-2 font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                          private
                        </span>
                      )}

                      {nextDraft.is_commissioner && (
                        <span className="text-xs mt-2 font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                          draw master
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray mt-2 italic">
                      {nextDraft.description}
                    </p>
                  </div>

                  {nextDraft.draft_status === "open" && (
                    <button
                      disabled
                      className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md"
                    >
                      Draft live in <Countdown target={new Date(nextDraft.draft_date)} />
                    </button>
                  )}

                  {nextDraft.draft_status === "closed" && (
                    <button
                      onClick={() => goToDraft(nextDraft.slug)}
                      className="bg-[#1f4785] text-white px-4 py-2 rounded-md"
                    >
                      Enter Draft Room
                    </button>
                  )}
                </div>
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
