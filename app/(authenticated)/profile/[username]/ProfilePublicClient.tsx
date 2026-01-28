"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
import { achievementIcons } from "@/lib/achievementIcons"
import type { AchievementId } from "@/lib/achievementIcons"
import AchievementModal from "@/components/AchievementModal"

type UserAchievement = {
  achievement_id: string
  achievements: {
    code: AchievementId | null
    name: string | null
    description: string | null
  }
  earned_at: string
}

export default function ProfilePublicClient({ username }: { username: string }) {
  const router = useRouter()

  const [achievements, setAchievements] = useState<UserAchievement[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [totalLeagues, setTotalLeagues] = useState(0)
  const [bestRank, setBestRank] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAchievement, setSelectedAchievement] = useState<{
    title: string | null
    description: string | null
    icon: string | null
    earnedAt: string | null
  } | null>(null)

  const wouldRatherOptions = [
    "have perfect draw weight",
    "make every called takeout",
    "never get tired from sweeping"
  ]

  useEffect(() => {
    async function loadProfile() {
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

      const { data: TheirProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single()

      if (TheirProfile?.username === username) {
        router.push("/profile")
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single()

      if (!data) {
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile(data)

      const { data: leagues } = await supabase
        .from("fantasy_event_users")
        .select("id, fantasy_events!inner(draft_status)")
        .eq("user_id", data.id)
        .in("fantasy_events.draft_status", ["locked", "completed", "archived"])

      setTotalLeagues(leagues?.length ?? 0)

      const { data: best } = await supabase
        .from("fantasy_event_users")
        .select("rank, fantasy_events!inner(draft_status)")
        .eq("user_id", data.id)
        .eq("fantasy_events.draft_status", ["completed", "archived"])
        .order("rank", { ascending: true })
        .limit(1)

      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          earned_at,
          achievements (
            code,
            name,
            description
          )
        `)
        .eq("user_id", data.id)

      setAchievements(
        (achievementsData ?? []).map((a) => {
          const row = Array.isArray(a.achievements)
            ? a.achievements[0]
            : a.achievements

          return {
            achievement_id: a.achievement_id,
            earned_at: a.earned_at,
            achievements: {
              code: row?.code ?? null,
              name: row?.name ?? null,
              description: row?.description ?? null
            }
          }
        })
      )

      setBestRank(best?.[0]?.rank ?? null)
      setLoading(false)
    }

    loadProfile()
  }, [username, router])

  if (loading)
    return (
      <div className="w-full flex justify-center mt-20 text-gray-600">
        Loading profile...
      </div>
    )

  if (!profile) return <p className="text-center mt-10">Profile not found.</p>

  if (!profile.is_public)
    return (
      <p className="text-center text-gray-600 mt-10">
        This profile is private.
      </p>
    )

  return (
    <>
      <div className="pb-14 px-4 sm:px-0">
        {selectedAchievement && (
          <AchievementModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={selectedAchievement?.title ?? ""}
            description={selectedAchievement?.description ?? ""}
            icon={
              selectedAchievement?.icon ? (
                <Image
                  src={selectedAchievement.icon}
                  alt={selectedAchievement.title ?? ""}
                  width={160}
                  height={160}
                />
              ) : null
            }
            viewOnly={true}
            earnedAt={selectedAchievement?.earnedAt ?? null}
          />
        )}

        <div className="max-w-3xl mx-auto px-4 py-5 sm:p-6 bg-white shadow-md rounded-lg">
          <div className="text-sm sm:text-base">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#234C6A]">
              {profile.username}'s Profile
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border border-[#456882]">
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl">
                {profile.username?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}

            <div>
              <p className="text-lg font-semibold">
                <strong>{profile.username}</strong>
              </p>
              <p>
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-sm text-gray-500">
                Joined on:{" "}
                {profile.joined_on
                  ? new Date(profile.joined_on + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-semibold text-[#234C6A] mb-3">
              Fantasy Stats
            </h2>

            <p className="text-gray-700">Leagues played in: {totalLeagues}</p>

            {bestRank !== null && (
              <p className="text-gray-700">
                Best finish in an event: {bestRank}
              </p>
            )}
          </div>
          
          {achievements.some(a => a.achievements.code && achievementIcons[a.achievements.code]) && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold text-[#234C6A] mb-3">
                Pin Collection
              </h2>

              <div className="flex gap-4 flex-wrap">
                {achievements.map((a) => {
                  const code = a.achievements.code
                  if (!code) return null

                  const icon = achievementIcons[code]
                  if (!icon) return null

                  return (
                    <button
                      key={a.achievement_id}
                      onClick={() => {
                        setSelectedAchievement({
                          title: a.achievements.name,
                          earnedAt: a.earned_at,
                          description: a.achievements.description,
                          icon
                        })
                        setModalOpen(true)
                      }}
                      className="hover:scale-105 transition"
                    >
                      <Image src={icon} alt={code} width={60} height={60} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(profile.years_played ||
            profile.favorite_club ||
            profile.go_to_shot?.length > 0 ||
            profile.tradition ||
            profile.favorite_pro_team ||
            profile.would_rather ||
            profile.most_curling_thing ||
            profile.walkup_music ||
            profile.hot_take) && (
            <div className="mt-8 border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold text-[#234C6A] mb-3">
                Curling Profile
              </h2>

              {profile.years_played && (
                <p className="text-gray-700">
                  Years Played: {profile.years_played}
                </p>
              )}

              {profile.favorite_club && (
                <p className="text-gray-700">
                  Favorite Curling Club: {profile.favorite_club}
                </p>
              )}

              {profile.go_to_shot?.[0] && (
                <p className="text-gray-700">
                  Go-To Shot: {profile.go_to_shot[0]}
                </p>
              )}

              {profile.tradition && (
                <p className="text-gray-700">
                  Curling Tradition/Superstition: {profile.tradition}
                </p>
              )}

              {profile.favorite_pro_team && (
                <p className="text-gray-700">
                  Favorite Professional Team: {profile.favorite_pro_team}
                </p>
              )}

              {profile?.would_rather?.[0] && (
                <p className="text-gray-700">
                  Would Rather: {profile.would_rather[0]} than{" "}
                  {
                    wouldRatherOptions.filter(
                      opt => opt !== profile.would_rather[0]
                    )[0]
                  }{" "}
                  and{" "}
                  {
                    wouldRatherOptions.filter(
                      opt => opt !== profile.would_rather[0]
                    )[1]
                  }
                </p>
              )}

              {profile.most_curling_thing && (
                <p className="text-gray-700">
                  The Most “Curling Person” Thing {profile.username} Has Ever Done:{" "}
                  {profile.most_curling_thing}
                </p>
              )}

              {profile.walkup_music && (
                <p className="text-gray-700">
                  Curling Walk-Up Music: {profile.walkup_music}
                </p>
              )}

              {profile.hot_take && (
                <p className="text-gray-700">
                  Curling Hot Take: {profile.hot_take}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
