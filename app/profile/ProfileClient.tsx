"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import Image from "next/image"
import LoggedInNavBar from "@/components/LoggedInNavBar"

export default function ProfileClient() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [totalLeagues, setTotalLeagues] = useState<number>(0);
  const [bestRank, setBestRank] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(profile?.is_public);

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Curling profile fields
  const [yearsPlayed, setYearsPlayed] = useState(profile?.years_played ?? "");
  const [favoriteClub, setFavoriteClub] = useState(profile?.favorite_club ?? "");
  const [goToShot, setGoToShot] = useState<string | null>(profile?.go_to_shot?.[0] ?? null);
  const [tradition, setTradition] = useState(profile?.tradition ?? "");
  const [favoriteProTeam, setFavoriteProTeam] = useState(profile?.favorite_pro_team ?? "");
  const [wouldRather, setWouldRather] = useState<string | null>(profile?.would_rather ?? null);
  const [mostCurlingThing, setMostCurlingThing] = useState(profile?.most_curling_thing ?? "");
  const [walkupMusic, setWalkupMusic] = useState(profile?.walkup_music ?? "");
  const [hotTake, setHotTake] = useState(profile?.hot_take ?? "");
  const shotOptions = ["Guard", "Draw", "Takeout", "Plan B"];
  const wouldRatherOptions = [
    "have perfect draw weight",
    "make every called takeout",
    "never get tired from sweeping"
  ];

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/");
        return;
      }

      setUser(userData.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    }

    load();
  }, [router]);

  useEffect(() => {
    async function loadFantasyStats() {
      if (!user) return;

      const { data: leagues } = await supabase
        .from("fantasy_event_users")
        .select("id, fantasy_events!inner(draft_status)")
        .eq("user_id", user.id)
        .in("fantasy_events.draft_status", ["locked", "archived"]);

      setTotalLeagues(leagues?.length ?? 0);

      const { data: best } = await supabase
        .from("fantasy_event_users")
        .select("rank, fantasy_events!inner(draft_status)")
        .eq("user_id", user.id)
        .eq("fantasy_events.draft_status", "archived")
        .order("rank", { ascending: true })
        .limit(1);

      setBestRank(best?.[0]?.rank ?? null);
    }

    loadFantasyStats();
  }, [user]);

  useEffect(() => {
    if (profile?.is_public !== undefined) {
      setIsPublic(profile.is_public);
    }
  }, [profile]);

  async function saveProfileChanges() {
    if (!user) return;
    setSaving(true);
    setErrorMsg("");

    let avatarUrl = profile?.avatar_url || null;

    function extractFileName(url: string) {
      const parts = url.split("/avatars/");
      return parts[1] ?? null;
    }

    if (avatarFile) {
      if (profile?.avatar_url) {
        const oldFileName = extractFileName(profile.avatar_url);
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      if (avatarFile.size > 2 * 1024 * 1024) {
        setErrorMsg("Image must be under 2MB.");
        setSaving(false);
        return;
      }

      const ext = avatarFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile);

      if (uploadError) {
        console.log("UPLOAD ERROR:", uploadError);
        setErrorMsg("Failed to upload image.");
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      avatarUrl = urlData.publicUrl;
    }

    const cleanedYearsPlayed = emptyToNull(yearsPlayed);
    const cleanedFavoriteClub = emptyToNull(favoriteClub);
    const cleanedTradition = emptyToNull(tradition);
    const cleanedFavoriteProTeam = emptyToNull(favoriteProTeam);
    const cleanedMostCurlingThing = emptyToNull(mostCurlingThing);
    const cleanedWalkupMusic = emptyToNull(walkupMusic);
    const cleanedHotTake = emptyToNull(hotTake);
    const cleanedGoToShot = goToShot ? [goToShot] : null;
    const cleanedWouldRather = wouldRather ? [wouldRather] : null;

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
        hot_take: cleanedHotTake,
      })
      .eq("id", user.id);

    if (updateError) {
      if (updateError.message.includes("duplicate key value")) {
        setErrorMsg("Username is already taken.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setSaving(false);
      return;
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
      hot_take: cleanedHotTake,
    }));

    setIsEditing(false);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center mt-20 text-gray-600">
        Loading profile...
      </div>
    )
  }

  // Curling Profile
  function toggleShot(option: string) {
    if (goToShot === option) {
      setGoToShot(null); 
    } else {
      setGoToShot(option);
    }
  }
  function selectWouldRather(option: string) {
    setWouldRather(option);
  }
  function clearWouldRather() {
    setWouldRather(null);
  }
  function emptyToNull(value: string) {
    return value.trim() === "" ? null : value;
  }

  return (
    <>
     <div className="w-full min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/webpage/profile-page.png')" }}>
      <LoggedInNavBar />

        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#234C6A]">
              {isEditing ? "Edit Profile" : "My Profile"}
            </h1>

            {!isEditing && (
              <div className="flex items-center gap-4">
                
                {/* PRIVATE / PUBLIC TOGGLE */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Private</span>

                  <button
                    onClick={async () => {
                      const newValue = !isPublic;
                      setIsPublic(newValue);

                      await supabase
                        .from("profiles")
                        .update({ is_public: newValue })
                        .eq("id", profile.id);
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

                {/* EDIT BUTTON */}
                <button
                  onClick={() => {
                    setNewUsername(profile?.username || "");
                    setYearsPlayed(profile?.years_played ?? "");
                    setFavoriteClub(profile?.favorite_club ?? "");
                    setGoToShot(profile?.go_to_shot?.[0] ?? null);
                    setTradition(profile?.tradition ?? "");
                    setFavoriteProTeam(profile?.favorite_pro_team ?? "");
                    setWouldRather(profile?.would_rather?.[0] ?? null);
                    setMostCurlingThing(profile?.most_curling_thing ?? "");
                    setWalkupMusic(profile?.walkup_music ?? "");
                    setHotTake(profile?.hot_take ?? "");
                    setIsEditing(true);
                  }}
                  className="px-2 py-1 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Edit Profile
                </button>

              </div>
            )}
          </div>

          {/* STATIC PROFILE VIEW */}
          {!isEditing && (
            <>
              <div className="flex items-center gap-6">
                {/* Avatar */}
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
                  <p className="">
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
                <h2 className="text-xl font-semibold text-[#234C6A] mb-3">
                  Fantasy Stats
                </h2>

                <p className="text-gray-700">
                  Leagues played in: {totalLeagues}
                </p>

                {bestRank !== null && (
                  <p className="text-gray-700">
                    Best finish in an event: {bestRank}
                  </p>
                )}
              </div>

              {/* CURLING PROFILE */}
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
                      I would rather {profile.would_rather[0]} over{" "}
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

          {/* EDIT MODE */}
          {isEditing && (
            <div className="mt-8 border-t pt-6">
              {errorMsg && (
                <p className="text-[#AA2B1D] mb-3 font-medium">{errorMsg}</p>
              )}

              <div className="flex flex-col gap-4">
                {/* Username */}
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="New username"
                />

                {/* Avatar Upload */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                />

                {/* YEARS PLAYED */}
                <input
                  type="text"
                  value={yearsPlayed}
                  onChange={(e) => setYearsPlayed(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="I’ve played for ___ years"
                />

                {/* FAVORITE CLUB */}
                <input
                  type="text"
                  value={favoriteClub}
                  onChange={(e) => setFavoriteClub(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My favorite club to play in is..."
                />

                {/* GO TO SHOT */}
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
                        onClick={() => setGoToShot(null)}
                        className="mt-2 text-sm text-red-600 underline"
                      >
                        clear selection
                      </button>
                    )}
                  </div>

                {/* TRADITION */}
                <input
                  type="text"
                  value={tradition}
                  onChange={(e) => setTradition(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My curling tradition/superstition..."
                />

                {/* FAVORITE PRO TEAM */}
                <input
                  type="text"
                  value={favoriteProTeam}
                  onChange={(e) => setFavoriteProTeam(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My favorite professional team..."
                />

                {/* WOULD RATHER */}
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

                {/* MOST CURLING THING */}
                <input
                  type="text"
                  value={mostCurlingThing}
                  onChange={(e) => setMostCurlingThing(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="The most 'curling person' thing I've ever done..."
                />

                {/* WALKUP MUSIC */}
                <input
                  type="text"
                  value={walkupMusic}
                  onChange={(e) => setWalkupMusic(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="If curling had walk-up music, mine would be..."
                />

                {/* HOT TAKE */}
                <input
                  type="text"
                  value={hotTake}
                  onChange={(e) => setHotTake(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2"
                  placeholder="My curling hot take..."
                />

                {/* BUTTONS */}
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
        </div>
      </div>
    </>
  );
}
