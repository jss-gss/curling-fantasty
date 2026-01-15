"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoggedInNavBar from "@/components/LoggedInNavBar"

export default function ProfilePublicClient({ username }: { username: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalLeagues, setTotalLeagues] = useState(0);
  const [bestRank, setBestRank] = useState<number | null>(null);
  const wouldRatherOptions = [
    "have perfect draw weight",
    "make every called takeout",
    "never get tired from sweeping"
  ];

  useEffect(() => {
    async function loadProfile() {
      // Check if logged-in user is viewing their own profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: TheirProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (TheirProfile?.username?.toLowerCase() === username.toLowerCase()) {
          router.push("/profile");
          return;
        }
      }

      // Load public profile
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (!data) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data);

      const { data: leagues } = await supabase
        .from("fantasy_event_users")
        .select("id, fantasy_events!inner(draft_status)")
        .eq("user_id", data.id)
        .in("fantasy_events.draft_status", ["locked", "archived"]);

      setTotalLeagues(leagues?.length ?? 0);

      const { data: best } = await supabase
        .from("fantasy_event_users")
        .select("rank, fantasy_events!inner(draft_status)")
        .eq("user_id", data.id)
        .eq("fantasy_events.draft_status", "archived")
        .order("rank", { ascending: true })
        .limit(1);

      setBestRank(best?.[0]?.rank ?? null);

      setLoading(false);
    }

    loadProfile();
  }, [username, router, supabase]);

  if (loading)
    return (
      <div className="w-full flex justify-center mt-20 text-gray-600">
        Loading profile...
      </div>
    );

  if (!profile) return <p className="text-center mt-10">Profile not found.</p>;

  if (!profile.is_public)
    return (
      <p className="text-center text-gray-600 mt-10">
        This profile is private.
      </p>
    );

  return (
    <>
      <div className="w-full min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/webpage/profile-page.png')" }}>

        <LoggedInNavBar />
      
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#234C6A]">
              {profile.username}'s Profile
            </h1>
          </div>

          {/* STATIC PROFILE VIEW */}
          <div className="flex items-center gap-6">
            {/* Avatar */}
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

          {/* FANTASY STATS */}
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

          {/* CURLING PROFILE */}
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
                  {profile.username}'s Go-To Shot: {profile.go_to_shot[0]}
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
                  Would Rather: {profile.would_rather[0]} over{" "}
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

              {profile.most_curling_thing && (
                <p className="text-gray-700">
                  The Most “Curling Person” Thing {profile.username} Has Ever Done: {" "}
                  {profile.most_curling_thing}
                </p>
              )}

              {profile.walkup_music && (
                <p className="text-gray-700">
                  Curling Walk-Up Music: {" "}
                  {profile.walkup_music}
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
    </>
  );
}
