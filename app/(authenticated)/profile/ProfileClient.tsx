"use client"

import { useEffect, useState } from "react"
import { achievementIcons } from "@/lib/achievementIcons"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { AchievementId } from "@/lib/achievementIcons"
import Image from "next/image"
import AchievementModal from "@/components/AchievementModal"
import AvatarCropModal from "@/components/AvatarCropModal"

type UserAchievement = {
  achievement_id: string
  achievements: {
    code: AchievementId | null
    name: string | null
    description: string | null
  }
  earned_at: string
}

export default function ProfileClient() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [totalLeagues, setTotalLeagues] = useState(0)
  const [bestRank, setBestRank] = useState<number | null>(null)
  const [totalCommissioned, setCommissioned] = useState(0)
  const [isPublic, setIsPublic] = useState<boolean | undefined>(undefined)

  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [selectedAchievement, setSelectedAchievement] = useState<{
    title: string | null
    description: string | null
    icon: string | null
    earnedAt: string | null
  } | null>(null)

  const [yearsPlayed, setYearsPlayed] = useState("")
  const [favoriteClub, setFavoriteClub] = useState("")
  const [goToShot, setGoToShot] = useState<string | null>(null)
  const [tradition, setTradition] = useState("")
  const [favoriteProTeam, setFavoriteProTeam] = useState("")
  const [wouldRather, setWouldRather] = useState<string | null>(null)
  const [mostCurlingThing, setMostCurlingThing] = useState("")
  const [achievements, setAchievements] = useState<UserAchievement[]>([])  
  const [walkupMusic, setWalkupMusic] = useState("")
  const [hotTake, setHotTake] = useState("")
  const shotOptions = ["Guard", "Draw", "Takeout", "Plan B"]
  const wouldRatherOptions = [
    "have perfect draw weight",
    "make every called takeout",
    "never get tired from sweeping"
  ]

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
      setIsPublic(profileData?.is_public)

      setYearsPlayed(profileData?.years_played ?? "")
      setFavoriteClub(profileData?.favorite_club ?? "")
      setGoToShot(profileData?.go_to_shot?.[0] ?? null)
      setTradition(profileData?.tradition ?? "")
      setFavoriteProTeam(profileData?.favorite_pro_team ?? "")
      setWouldRather(profileData?.would_rather?.[0] ?? null)
      setMostCurlingThing(profileData?.most_curling_thing ?? "")
      setWalkupMusic(profileData?.walkup_music ?? "")
      setHotTake(profileData?.hot_take ?? "")

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
      .eq("user_id", user.id)

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
            },
          }
        })
      )

      setLoading(false)
    }

    load()
  }, [router])

  useEffect(() => {
    async function loadFantasyStats() {
      if (!user) return

      const { data: leagues } = await supabase
        .from("fantasy_event_users")
        .select("id, fantasy_events!inner(draft_status)")
        .eq("user_id", user.id)
        .in("fantasy_events.draft_status", ["locked", "completed", "archived"])

      setTotalLeagues(leagues?.length ?? 0)

      const { data: best } = await supabase
        .from("fantasy_event_users")
        .select("rank, fantasy_events!inner(draft_status)")
        .eq("user_id", user.id)
        .in("fantasy_events.draft_status", ["completed", "archived"])
        .order("rank", { ascending: true })
        .limit(1)

      setBestRank(best?.[0]?.rank ?? null)

      const { data: commissioned } = await supabase
        .from("fantasy_events")
        .select("id", { count: "exact"})
        .eq("created_by", user.id)
        .in("draft_status", ["locked", "completed", "archived"])

      setCommissioned(commissioned?.length ?? 0)
    }

    loadFantasyStats()
  }, [user])

  useEffect(() => {
    if (isEditing) {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      })
    }
  }, [isEditing])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [isEditing])

  useEffect(() => {
    achievements.forEach((a) => {
      const code = a.achievements.code
      if (!code) return
      const src = achievementIcons[code]
      const img = new window.Image()
      img.src = src
      if (img.decode) img.decode().catch(() => {})
    })
  }, [achievements])

  async function saveProfileChanges() {
    if (!user) return
    setSaving(true)
    setErrorMsg("")

    let avatarUrl = profile?.avatar_url || null

    function extractFileName(url: string) {
      const parts = url.split("/avatars/")
      return parts[1] ?? null
    }

    if (avatarFile) {
      if (profile?.avatar_url) {
        const oldFileName = extractFileName(profile.avatar_url)
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName])
        }
      }

      const ext = avatarFile.name.split(".").pop()
      const fileName = `${user.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile)

      if (uploadError) {
        setErrorMsg("Failed to upload image.")
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName)

      avatarUrl = urlData.publicUrl
    }

    const cleanedYearsPlayed = emptyToNull(yearsPlayed)
    const cleanedFavoriteClub = emptyToNull(favoriteClub)
    const cleanedTradition = emptyToNull(tradition)
    const cleanedFavoriteProTeam = emptyToNull(favoriteProTeam)
    const cleanedMostCurlingThing = emptyToNull(mostCurlingThing)
    const cleanedWalkupMusic = emptyToNull(walkupMusic)
    const cleanedHotTake = emptyToNull(hotTake)
    const cleanedGoToShot = goToShot ? [goToShot] : null
    const cleanedWouldRather = wouldRather ? [wouldRather] : null

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: newUsername,
        avatar_url: avatarUrl,
        years_played: cleanedYearsPlayed,
        favorite_club: cleanedFavoriteClub,
        go_to_shot: cleanedGoToShot,
        tradition: cleanedTradition,
        favorite_pro_team: cleanedFavoriteProTeam,
        would_rather: cleanedWouldRather,
        most_curling_thing: cleanedMostCurlingThing,
        walkup_music: cleanedWalkupMusic,
        hot_take: cleanedHotTake
      })
      .eq("id", user.id)

    if (updateError) {
      if (updateError.message.includes("duplicate key value")) {
        setErrorMsg("Username is already taken.")
      } else {
        setErrorMsg("Something went wrong. Please try again.")
      }
      setSaving(false)
      return
    }

    setProfile((prev: any) => ({
      ...prev,
      username: newUsername,
      avatar_url: avatarUrl,
      years_played: cleanedYearsPlayed,
      favorite_club: cleanedFavoriteClub,
      go_to_shot: cleanedGoToShot,
      tradition: cleanedTradition,
      favorite_pro_team: cleanedFavoriteProTeam,
      would_rather: cleanedWouldRather,
      most_curling_thing: cleanedMostCurlingThing,
      walkup_music: cleanedWalkupMusic,
      hot_take: cleanedHotTake
    }))

    setIsEditing(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center mt-20 text-gray-600">
        Loading profile...
      </div>
    )
  }

  function toggleShot(option: string) {
    setGoToShot(option)
  }

  function clearShot() {
    setGoToShot(null)
  }

  function selectWouldRather(option: string) {
    setWouldRather(option)
  }

  function clearWouldRather() {
    setWouldRather(null)
  }

  function emptyToNull(value: string) {
    return value.trim() === "" ? null : value
  }

  return (
    <>
      <div className="relative min-h-screen pt-10 pb-14 px-4 sm:px-0 overflow-x-hidden">
        <div
          className="hidden lg:block fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/webpage/profile-page.png')" }}
        />
        <div className="max-w-3xl mx-auto px-4 py-5 sm:p-6 bg-white shadow-md rounded-lg">
          <div className="text-sm sm:text-base">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#234C6A]">
                  {isEditing ? "Edit Profile" : "My Profile"}
                </h1>

                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Private</span>

                    <button
                      onClick={async () => {
                        const newValue = !isPublic
                        setIsPublic(newValue)

                        await supabase
                          .from("profiles")
                          .update({ is_public: newValue })
                          .eq("id", profile.id)
                      }}
                      className={`w-10 h-5 rounded-full relative transition ${
                        isPublic ? "bg-blue-500" : "bg-gray-400"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${
                          isPublic ? "translate-x-5" : ""
                        }`}
                      />
                    </button>

                    <span className="text-xs text-gray-500">Public</span>
                  </div>
                )}
              </div>
            </div>
          {!isEditing && (
            <>
              <div className="flex items-center gap-6">
                {profile?.avatar_url ? (
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
                    {profile?.username?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                )}

                <div>
                  <p className="text-lg font-semibold">
                    <strong>{profile?.username}</strong>
                  </p>
                  <p> 
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">Joined on:{" "}
                  {profile?.joined_on
                    ? new Date(profile.joined_on + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      ) : "—"}
                  </p>
                </div>              
              </div>

              <div className="mt-8 border-t pt-6">
                <h2 className="text-xl font-semibold text-[#234C6A] mb-2">
                  Fantasy Stats
                </h2>

                <div className="w-full sm:w-auto">
                  <div className="p-3 sm:p-0 sm:border-0 sm:bg-transparent">
                    <div className="grid grid-cols-3 mt-2 sm:mt-6 sm:gap-6">
                      <div className="flex flex-col items-center">
                        <div className="text-gray-500 text-xs sm:text-sm">Leagues Played</div>
                        <div className="text-lg sm:text-xl font-bold">{totalLeagues}</div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="text-gray-500 text-xs sm:text-sm">Commissioned</div>
                        <div className="text-lg sm:text-xl font-bold">{totalCommissioned}</div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="text-gray-500 text-xs sm:text-sm">Best Finish</div>
                        <div className="text-lg sm:text-xl font-bold">{bestRank}
                          <span>
                            {bestRank === null ? "-" : bestRank === 1 ? "st" : bestRank === 2 ? "nd" : bestRank === 3 ? "rd" : "th"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                                description: a.achievements.description,
                                icon: a.achievements.code ? achievementIcons[a.achievements.code] : null,
                                earnedAt: a.earned_at
                              })
                              setModalOpen(true)
                            }}
                            className="hover:scale-105 transition"
                          >
                            {a.achievements.code && (
                              <Image
                                src={achievementIcons[a.achievements.code]}
                                alt={a.achievements.name ?? "achievement"}
                                width={60}
                                height={60}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                </div>
              )}

              {(profile?.years_played ||
                profile?.favorite_club ||
                profile?.go_to_shot?.length > 0 ||
                profile?.tradition ||
                profile?.favorite_pro_team ||
                profile?.would_rather ||
                profile?.most_curling_thing ||
                profile?.walkup_music ||
                profile?.hot_take) && (
                <div className="mt-8 border-t pt-6 space-y-4">
                  <h2 className="text-xl font-semibold text-[#234C6A] mb-3">
                    Curling Profile
                  </h2>

                  {profile?.years_played && (
                    <p className="text-gray-700">
                      I’ve played for {profile.years_played} years
                    </p>
                  )}

                  {profile?.favorite_club && (
                    <p className="text-gray-700">
                      My favorite curling club is {profile.favorite_club}
                    </p>
                  )}

                  {profile?.go_to_shot?.[0] && (
                    <p className="text-gray-700">
                      My go-to shot is {profile.go_to_shot[0]}
                    </p>
                  )}

                  {profile?.tradition && (
                    <p className="text-gray-700">
                      My curling tradition/superstition is {" "}
                      {profile.tradition}
                    </p>
                  )}

                  {profile?.favorite_pro_team && (
                    <p className="text-gray-700">
                      My favorite professional team is {profile.favorite_pro_team}
                    </p>
                  )}

                  {profile?.would_rather?.[0] && (
                    <p className="text-gray-700">
                      I would rather {profile.would_rather[0]} than{" "}
                      {
                        wouldRatherOptions.filter(
                          (opt) => opt !== profile.would_rather[0]
                        )[0]
                      }{" "}
                      and{" "}
                      {
                        wouldRatherOptions.filter(
                          (opt) => opt !== profile.would_rather[0]
                        )[1]
                      }
                    </p>
                  )}

                  {profile?.most_curling_thing && (
                    <p className="text-gray-700">
                      The most “curling person” thing I’ve ever done is {" "}
                      {profile.most_curling_thing}
                    </p>
                  )}

                  {profile?.walkup_music && (
                    <p className="text-gray-700">
                      If curling had walk-up music, mine would be {" "}
                      {profile.walkup_music}
                    </p>
                  )}

                  {profile?.hot_take && (
                    <p className="text-gray-700">
                      My curling hot take is {profile.hot_take}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {!isEditing && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold text-[#234C6A] mb-3">
                Actions
              </h2>

              <div className="flex flex-col gap-3 text-sm">
                <button
                  onClick={() => {
                    setNewUsername(profile?.username || "")
                    setYearsPlayed(profile?.years_played ?? "")
                    setFavoriteClub(profile?.favorite_club ?? "")
                    setGoToShot(profile?.go_to_shot?.[0] ?? null)
                    setTradition(profile?.tradition ?? "")
                    setFavoriteProTeam(profile?.favorite_pro_team ?? "")
                    setWouldRather(profile?.would_rather?.[0] ?? null)
                    setMostCurlingThing(profile?.most_curling_thing ?? "")
                    setWalkupMusic(profile?.walkup_music ?? "")
                    setHotTake(profile?.hot_take ?? "")
                    setIsEditing(true)
                  }}
                  className="text-left text-gray-600 hover:text-[#AA2B1D] transition-colors"
                >
                  Edit profile
                </button>

                <button
                  onClick={() => router.push("/resetpassword")}
                  className="text-left text-gray-600 hover:text-[#AA2B1D] transition-colors"
                >
                  Change password
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.push("/")
                  }}
                  className="text-left text-gray-600 hover:text-[#AA2B1D] transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="mt-8 border-t pt-6">
              {errorMsg && (
                <p className="text-[#AA2B1D] mb-3 font-medium">{errorMsg}</p>
              )}

              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="New username"
                />

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (!file) return

                      if (file.size > 2 * 1024 * 1024) {
                        setErrorMsg("Image must be under 2MB.")
                        return
                      }

                      const reader = new FileReader()
                      reader.onload = () => {
                        setPendingImageSrc(reader.result as string)
                        setCropOpen(true)
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                  />

                  <div className="border border-gray-300 rounded-md px-4 py-2 text-gray-500">
                    {avatarFile ? avatarFile.name : "Upload profile picture"}
                  </div>
                </div>

                <input
                  type="text"
                  value={yearsPlayed}
                  onChange={(e) => setYearsPlayed(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="I’ve played for ___ years"
                />

                <input
                  type="text"
                  value={favoriteClub}
                  onChange={(e) => setFavoriteClub(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My favorite club to play in is..."
                />

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-gray-700">
                      My go-to shot:
                    </p>

                    {shotOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => toggleShot(option)}
                        className={`px-3 py-1 rounded-md border ${
                          goToShot === option
                            ? "bg-[#234C6A] text-white border-[#234C6A]"
                            : "bg-white text-[#234C6A] border-[#234C6A]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                    {goToShot !== null && goToShot !== "" && (
                      <button
                        onClick={clearShot}
                        className="mt-2 text-sm text-red-600 underline"
                      >
                        clear selection
                      </button>
                    )}
                  </div>

                <input
                  type="text"
                  value={tradition}
                  onChange={(e) => setTradition(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My curling tradition/superstition..."
                />

                <input
                  type="text"
                  value={favoriteProTeam}
                  onChange={(e) => setFavoriteProTeam(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My favorite professional team..."
                />

                <div>
                  <p className="font-semibold text-gray-700 mb-2">
                    I would rather:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wouldRatherOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => selectWouldRather(option)}
                        className={`px-3 py-1 rounded-md border ${
                          wouldRather === option
                            ? "bg-[#234C6A] text-white border-[#234C6A]"
                            : "bg-white text-[#234C6A] border-[#234C6A]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {wouldRather && (
                    <button
                      onClick={clearWouldRather}
                      className="mt-2 text-sm text-red-600 underline"
                    >
                      clear selection
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={mostCurlingThing}
                  onChange={(e) => setMostCurlingThing(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="The most 'curling person' thing I've ever done..."
                />

                <input
                  type="text"
                  value={walkupMusic}
                  onChange={(e) => setWalkupMusic(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="If curling had walk-up music, mine would be..."
                />

                <input
                  type="text"
                  value={hotTake}
                  onChange={(e) => setHotTake(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My curling hot take..."
                />

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProfileChanges}
                    disabled={saving}
                    className="px-4 py-2 bg-[#234C6A] text-white rounded-md hover:bg-[#1B3C53] disabled:bg-gray-400"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedAchievement && (
            <AchievementModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title={selectedAchievement?.title ?? ""}
              description={selectedAchievement?.description ?? ""}
              iconSrc={selectedAchievement?.icon ?? null}
              viewOnly
              earnedAt={selectedAchievement?.earnedAt ?? null}
            />
          )}

          <AvatarCropModal
            open={cropOpen}
            imageSrc={pendingImageSrc}
            onClose={() => setCropOpen(false)}
            onSave={(croppedFile) => {
              setAvatarFile(croppedFile)
            }}
          />
        </div>
      </div>
      </div>
    </>
  )
}
