"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import LoggedInNavBar from "@/components/LoggedInNavBar"
import CreateLeagueModal from "@/components/CreateLeagueModal"

export default function LeaguesPage() {
  const [user, setUser] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLeague, setEditingLeague] = useState<any>(null);

  // types of leagues 
  const commissionedLeagues = leagues.filter(
    (l) => l.created_by === user?.id
  )

  const privateInvites = leagues.filter(
    (l) =>
      !l.is_public &&
      !l.enrolled && 
      l.created_by !== user?.id &&
      l.fantasy_event_users?.some((u: any) => u.user_id === user?.id)
  )

  const myActiveLeagues = leagues.filter(
    (l) =>
      (l.enrolled || l.created_by === user?.id) &&
      l.draft_status === "locked"
  )

  const myUpcomingDrafts = leagues.filter(
    (l) =>
      (l.enrolled || l.created_by === user?.id) &&
      (l.draft_status === "open")
  )

  const findAvailableLeagues = leagues.filter(
    (l) =>
      l.is_public &&
      !l.enrolled &&
      (l.draft_status === "open") &&
      (l.fantasy_event_users?.length ?? 0) < l.max_users
  )

  const findClosedLeagues = leagues.filter((l) => {
  const isClosed =
    l.draft_status === "locked" ||
    l.draft_status === "archived" ||
    (l.draft_status === "open" &&
      (l.fantasy_event_users?.length ?? 0) >= l.max_users)

    return (l.is_public &&  !l.enrolled &&isClosed )
  })

  //modal 
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<any[]>([])
  const [activeLeagueCount, setActiveLeagueCount] = useState(0)
  
  // ui
  const [activeTab, setActiveTab] = useState<"mine" | "explore" >("mine")

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

    const { data: leagueData } = await supabase
      .from("fantasy_events")
      .select(`
        *,
        curling_events (*),
        fantasy_event_users ( user_id ),
        users:profiles!fantasy_events_created_by_fkey ( id, username, is_public )
      `)
      .order("draft_date", { ascending: true });

      if (!leagueData) {
        setLeagues([])
        setLoading(false)
        return
      }

      const processed = leagueData.map((l) => ({
        ...l,
        enrolled: l.fantasy_event_users?.some(
          (u: any) => u.user_id === userData.user.id
        ),
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
        .order("start_date", { ascending: true });

      setEvents(data || []);
    }

    loadEvents();
  }, []);


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

  function LeagueCard({ league, commissionerView, invitedView }: any) {
    const isCommissioner = commissionerView || league.created_by === user?.id;

    const isInvited =
      invitedView ||
      (!league.is_public &&
        !league.enrolled &&
        league.fantasy_event_users?.some((u: any) => u.user_id === user?.id));

    const isOpen = league.draft_status === "open";
    const isFull = (league.fantasy_event_users?.length ?? 0) >= league.max_users;
    const isJoinable = isOpen && !isFull;
    const hasEventStarted = league.curling_events && new Date() >= new Date(league.curling_events.start_date)

    return (
      <div className="flex relative items-center justify-between bg-white shadow-md p-6 border border-gray-200 rounded-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{league.name}</h2>

            {league.is_public ? (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                public
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                private
              </span>
            )}

            {isCommissioner && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                commissioner
              </span>
            )}
          </div>

          {league.description && (
            <p className="text-gray-700 text-sm mt-1 italic">{league.description}</p>
          )}

          <p className="text-md text-gray mt-3">
            {league.curling_events.year} {league.curling_events.name} in {league.curling_events.location}
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
            <strong> • Draft:</strong> {new Date(league.draft_date).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET •{" "}
            <strong>Event Starts:</strong>{" "}
            {league.curling_events
              ? new Date(league.curling_events.start_date).toLocaleDateString()
              : "TBD"}{" "}
            <strong> • Players:</strong> {(league.fantasy_event_users?.length ?? 0)} / {league.max_users}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
        {isCommissioner ? (
          isOpen ? (
            <button
              onClick={() => {
                setEditingLeague(league)
                setShowModal(true)
              }}
              className="bg-[#1f4785] text-white px-6 py-2 rounded-md hover:bg-[#163766] transition"
            >
              Edit
            </button>
          ) : !hasEventStarted ? (
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
            >
              Picks Locked
            </button>
          ) : (
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
            >
              Event Live
            </button>
          )
          ) : isInvited ? (
            isOpen ? (
              <button
                onClick={() => joinLeague(league.id)}
                className="bg-[#234C6A] text-white px-6 py-2 rounded-md hover:bg-[#1B3C53] transition"
              >
                Join
              </button>
            ) : (
              <button
                disabled
                className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
              >
                Closed
              </button>
            )
          ) : league.enrolled ? (
            league.draft_status === "closed" ? (
              <button
                disabled
                className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
              >
                Draft In Progress
              </button>
            ) : league.draft_status === "locked" ? (
              !hasEventStarted ? (
                <button
                  disabled
                  className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
                >
                  Picks Locked
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
                >
                  Event Live
                </button>
              )
            ) : league.draft_status === "archived" ? (
              <button
                disabled
                className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
              >
                Archived
              </button>
            ) : (
              <button
                onClick={() => leaveLeague(league.id)}
                className="bg-[#AA2B1D] text-white px-6 py-2 hover:bg-[#8A1F15] transition rounded-md"
              >
                Leave
              </button>
            )
          ) : isFull || league.draft_status === "closed" ? (
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-6 py-2 cursor-not-allowed rounded-md"
            >
              Closed
            </button>
          ) : (
            <button
              disabled={!isJoinable}
              onClick={() => isJoinable && joinLeague(league.id)}
              className={`px-4 py-2 text-white rounded-md ${
                isJoinable
                  ? "bg-[#234C6A] hover:bg-[#1B3C53] cursor-pointer"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isFull ? "Full" : "Join"}
            </button>
          )}
        </div>
      </div>
    );
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
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data } = await supabase
        .from("fantasy_events")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();

      if (!data) return slug;

      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  async function handleCreateLeague(payload: any) {
    if (!user) return;

    const { eventId, name, description, draftDate, isPublic, usernames } = payload;

    function parseLocalDateTime(dt: string) {
      const [datePart, timePart] = dt.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hour, minute);
    }

    const utcDraftDate = new Date(draftDate).toISOString();
    const baseSlug = generateBaseSlug(name);
    const slug = await generateUniqueSlug(baseSlug, supabase);

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
        max_users: 10
      })
      .select(`
        *,
        curling_events (*),
        fantasy_event_users ( user_id ),
        users:profiles!fantasy_events_created_by_fkey ( id, username, is_public )
      `)
      .single();

    if (error) return;

    if (!isPublic && usernames.trim() !== "") {
      const usernameList = usernames.split(",").map((u: string) => u.trim()).filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", usernameList);

      if (profiles?.length) {
        await supabase.from("fantasy_event_users").insert(
          profiles.map((p: { id: string }) => ({
            fantasy_event_id: newLeague.id,
            user_id: p.id
          }))
        );
      }
    }

    await supabase.from("fantasy_event_users").insert({
      fantasy_event_id: newLeague.id,
      user_id: user.id
    });

    setLeagues(prev => [
      ...prev,
      {
        ...newLeague,
        enrolled: true,
        fantasy_event_users: [{ user_id: user.id }]
      }
    ]);

    setShowModal(false);
  }

  async function handleUpdateLeague(payload: any) {
    if (!editingLeague) return;

    const { eventId, name, description, draftDate, isPublic } = payload;

    const utcDraftDate = new Date(draftDate).toISOString();

    let slug = editingLeague.slug;
    if (name !== editingLeague.name) {
      const baseSlug = generateBaseSlug(name);
      slug = await generateUniqueSlug(baseSlug, supabase);
    }

    const { data, error } = await supabase
      .from("fantasy_events")
      .update({
        curling_event_id: eventId,
        name,
        description,
        draft_date: utcDraftDate,
        is_public: isPublic,
        slug
      })
      .eq("id", editingLeague.id)
      .select()
      .single();

    if (!error) {
      setLeagues(prev =>
        prev.map(l => (l.id === editingLeague.id ? { ...l, ...data } : l))
      );
    }

    setShowModal(false);
    setEditingLeague(null);
  }

  async function handleDeleteLeague(id: string) {
    await supabase.from("fantasy_events").delete().eq("id", id);

    setLeagues(prev => prev.filter(l => l.id !== id));
    setShowModal(false);
    setEditingLeague(null);
  }

  return (
    <>
      <LoggedInNavBar />

      <CreateLeagueModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingLeague(null);
        }}
        onSubmit={editingLeague ? handleUpdateLeague : handleCreateLeague}
        onDelete={editingLeague ? () => handleDeleteLeague(editingLeague.id) : undefined}
        events={events}
        activeLeagueCount={activeLeagueCount}
        isNew={!editingLeague}
        league={editingLeague}
      />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">League Play</h1>

        {/* Tabs + Create Button Row */}
        <div className="flex items-center justify-between mb-10">
          {/* Tabs */}
          <div className="flex gap-4">
            {[
              { key: "mine", label: "My Leagues" },
              { key: "explore", label: "Explore Available Leagues" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-md ${
                  activeTab === tab.key
                    ? "bg-[#1f4785] text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Create League Floating Button */}
            <div className="relative group">
              <button
                disabled={activeLeagueCount >= 2}
                onClick={() => {
                  setEditingLeague(null)
                  setShowModal(true)
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-full text-white text-2xl shadow-md transition
                  ${
                    activeLeagueCount >= 2
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#1f4785] hover:bg-[#163766]"
                  }`}
              >
                +
              </button>

              <span
                className="absolute left-1/2 -translate-x-1/2 -bottom-12
                          whitespace-nowrap px-3 py-1 rounded-md text-sm
                          bg-white/60 text-black backdrop-blur-sm
                          opacity-0 group-hover:opacity-100 transition
                          pointer-events-none">
                Create League
              </span>
            </div>
        </div>

        {loading && <p>Loading leagues...</p>}

        {/* MY LEAGUES */}
        {activeTab === "mine" && (
          <>
          
            <h3 className="text-xl font-semibold mb-3 mt-6">Active Leagues</h3>
            <div className="flex flex-col gap-6 mb-10">
              {myActiveLeagues.length > 0 ? (
                myActiveLeagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))
              ) : (
                <p className="text-gray-600">No active leagues.</p>
              )}
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">Upcoming Drafts</h3>
            <div className="flex flex-col gap-6 mb-10">
              {myUpcomingDrafts.length > 0 ? (
                myUpcomingDrafts.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))
              ) : (
                <p className="text-gray-600">No upcoming drafts.</p>
              )}
            </div>

            {/* COMMISSIONED LEAGUES */}
            <h3 className="text-xl font-semibold mb-3 mt-6">My Commissioned Leagues</h3>
            <div className="flex flex-col gap-6 mb-10">
              {commissionedLeagues.length > 0 ? (
                commissionedLeagues.map((league) => (
                  <LeagueCard key={league.id} league={league} commissionerView />
                ))
              ) : (
                <p className="text-gray-600">You haven't created any leagues yet.</p>
              )}
            </div>
          </>
        )}

        {/* EXPLORE LEAGUES */}
        {activeTab === "explore" && (
          <>
            {/* Open Leagues */}
            <h3 className="text-xl font-semibold mb-3 mt-6">Open Leagues</h3>
            <div className="flex flex-col gap-6 mb-10">
              {findAvailableLeagues.length > 0 ? (
                findAvailableLeagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))
              ) : (
                <p className="text-gray-600">No leagues available.</p>
              )}
            </div>

            {/* Private Invites */}
            <h3 className="text-xl font-semibold mb-3 mt-6">Private Invites</h3>
            <div className="flex flex-col gap-6 mb-10">
              {privateInvites.length > 0 ? (
                privateInvites.map((league) => (
                  <LeagueCard key={league.id} league={league} invitedView />
                ))
              ) : (
                <p className="text-gray-600">No private league invites.</p>
              )}
            </div>

            {/* Closed / Full Leagues */}
            <h3 className="text-xl font-semibold mb-3 mt-6">Full Leagues</h3>
            <div className="flex flex-col gap-6 mb-10">
              {findClosedLeagues.length > 0 ? (
                findClosedLeagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))
              ) : (
                <p className="text-gray-600">No closed leagues.</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
